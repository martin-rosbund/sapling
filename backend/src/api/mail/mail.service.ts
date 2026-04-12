import { InjectQueue } from '@nestjs/bullmq';
import { EntityManager } from '@mikro-orm/core';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { Client } from '@microsoft/microsoft-graph-client';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { TemplateService } from '../template/template.service';
import { ENTITY_MAP } from '../../entity/global/entity.registry';
import { EmailTemplateItem } from '../../entity/EmailTemplateItem';
import { PersonItem } from '../../entity/PersonItem';
import {
  MailPreviewDto,
  MailPreviewResponseDto,
  MailSendDto,
} from './dto/mail.dto';
import { EmailDeliveryItem } from '../../entity/EmailDeliveryItem';
import { EmailDeliveryStatusItem } from '../../entity/EmailDeliveryStatusItem';
import { EntityItem } from '../../entity/EntityItem';
import { DocumentItem } from '../../entity/DocumentItem';
import { PersonSessionItem } from '../../entity/PersonSessionItem';
import {
  GOOGLE_CALLBACK_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIS_ENABLED,
} from '../../constants/project.constants';

type JsonRecord = Record<string, unknown>;

type MailAttachment = {
  handle: number;
  filename: string;
  mimetype: string;
  filePath: string;
};

type SendResult = {
  responseStatusCode?: number;
  responseBody?: object;
  providerMessageId?: string;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function toPersistedObject(value: unknown): object | undefined {
  return isRecord(value) ? value : undefined;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly templateService: TemplateService,
    @InjectQueue('emails') private readonly emailQueue: Queue,
  ) {}

  async previewEmail(
    previewDto: MailPreviewDto,
    currentUser: PersonItem,
  ): Promise<MailPreviewResponseDto> {
    const entity = await this.em.findOne(EntityItem, {
      handle: previewDto.entityHandle,
    });

    if (!entity) {
      throw new NotFoundException('global.entityNotFound');
    }

    const template = previewDto.templateHandle
      ? await this.em.findOne(EmailTemplateItem, {
          handle: previewDto.templateHandle,
        })
      : null;

    const context = await this.resolveContext(previewDto, currentUser);
    const subjectSource = previewDto.subject ?? template?.subjectTemplate ?? '';
    const bodySource =
      previewDto.bodyMarkdown ?? template?.bodyMarkdown ?? '';

    const subject = this.replacePlaceholders(subjectSource, context);
    const bodyMarkdown = this.replacePlaceholders(bodySource, context);

    return {
      entityHandle: previewDto.entityHandle,
      itemHandle: previewDto.itemHandle,
      templateHandle: previewDto.templateHandle,
      to: this.replaceRecipients(previewDto.to, context),
      cc: this.replaceRecipients(previewDto.cc, context),
      bcc: this.replaceRecipients(previewDto.bcc, context),
      subject,
      bodyMarkdown,
      bodyHtml: this.renderMarkdown(bodyMarkdown),
      attachmentHandles: previewDto.attachmentHandles ?? [],
    };
  }

  async sendEmail(
    sendDto: MailSendDto,
    currentUser: PersonItem,
  ): Promise<EmailDeliveryItem> {
    const preview = await this.previewEmail(sendDto, currentUser);
    if (preview.to.length === 0) {
      throw new BadRequestException('mail.toRequired');
    }

    const entity = await this.em.findOne(EntityItem, {
      handle: sendDto.entityHandle,
    });
    if (!entity) {
      throw new NotFoundException('global.entityNotFound');
    }

    const pending = await this.ensureStatus(this.em, 'pending');
    const delivery = new EmailDeliveryItem();
    delivery.status = pending;
    delivery.entity = entity;
    delivery.createdBy = currentUser;
    delivery.template = sendDto.templateHandle
      ? ((await this.em.findOne(EmailTemplateItem, {
          handle: sendDto.templateHandle,
        })) ?? undefined)
      : undefined;
    delivery.referenceHandle =
      sendDto.itemHandle !== undefined ? String(sendDto.itemHandle) : undefined;
    delivery.provider = currentUser.type?.handle ?? 'sapling';
    delivery.toRecipients = preview.to;
    delivery.ccRecipients = preview.cc;
    delivery.bccRecipients = preview.bcc;
    delivery.subject = preview.subject;
    delivery.bodyMarkdown = preview.bodyMarkdown;
    delivery.bodyHtml = preview.bodyHtml;
    delivery.attachmentHandles = preview.attachmentHandles ?? [];
    delivery.requestPayload = {
      to: preview.to,
      cc: preview.cc,
      bcc: preview.bcc,
      subject: preview.subject,
      attachmentHandles: preview.attachmentHandles ?? [],
    };
    delivery.attemptCount = 0;

    await this.em.persist(delivery).flush();

    if (REDIS_ENABLED) {
      await this.emailQueue.add('deliver-email', {
        deliveryId: delivery.handle,
      });
    } else if (delivery.handle) {
      await this.dispatchDelivery(delivery.handle);
    }

    return (await this.em.findOneOrFail(EmailDeliveryItem, {
      handle: delivery.handle,
    })) as EmailDeliveryItem;
  }

  async dispatchDelivery(deliveryId: number): Promise<EmailDeliveryItem> {
    const em = this.em.fork();
    const delivery = await em.findOne(
      EmailDeliveryItem,
      { handle: deliveryId },
      {
        populate: [
          'status',
          'template',
          'entity',
          'createdBy',
          'createdBy.type',
          'createdBy.session',
        ],
      },
    );

    if (!delivery) {
      throw new NotFoundException('mail.deliveryNotFound');
    }

    delivery.attemptCount = (delivery.attemptCount ?? 0) + 1;

    try {
      const attachments = await this.loadAttachments(
        em,
        delivery.attachmentHandles ?? [],
      );
      const result = await this.sendWithProvider(delivery, attachments, em);
      const success = await this.ensureStatus(em, 'success');
      delivery.status = success;
      delivery.responseStatusCode = result.responseStatusCode;
      delivery.responseBody = result.responseBody;
      delivery.providerMessageId = result.providerMessageId;
      delivery.completedAt = new Date();
      await em.flush();
      return delivery;
    } catch (error) {
      const failed = await this.ensureStatus(em, 'failed');
      delivery.status = failed;
      delivery.responseStatusCode = 500;
      delivery.responseBody = {
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      delivery.completedAt = new Date();
      await em.flush();
      throw error;
    }
  }

  private async resolveContext(
    previewDto: MailPreviewDto,
    currentUser: PersonItem,
  ): Promise<JsonRecord> {
    const base = previewDto.itemHandle
      ? await this.loadEntityContext(previewDto.entityHandle, previewDto.itemHandle)
      : {};

    return {
      currentUser,
      ...base,
      ...(previewDto.draftValues ?? {}),
    };
  }

  private async loadEntityContext(
    entityHandle: string,
    itemHandle: string | number,
  ): Promise<JsonRecord> {
    const entityClass = ENTITY_MAP[entityHandle];
    if (!entityClass) {
      throw new NotFoundException('global.entityNotFound');
    }

    const template = this.templateService.getEntityTemplate(entityHandle);
    const populate = template.filter((entry) => entry.isReference).map((entry) => entry.name);
    const normalizedHandle = this.normalizeHandleValue(itemHandle);
    const item = await this.em.findOne(
      entityClass,
      { handle: normalizedHandle },
      { populate },
    );

    if (!item) {
      throw new NotFoundException('global.entryNotFound');
    }

    return item as JsonRecord;
  }

  private normalizeHandleValue(value: string | number): string | number {
    if (typeof value === 'number') {
      return value;
    }

    return /^\d+$/.test(value) ? Number(value) : value;
  }

  private replaceRecipients(
    input: string[] | string | undefined,
    context: JsonRecord,
  ): string[] {
    return this.normalizeRecipients(input).map((recipient) =>
      this.replacePlaceholders(recipient, context),
    );
  }

  private normalizeRecipients(input: string[] | string | undefined): string[] {
    if (!input) {
      return [];
    }

    const values = Array.isArray(input) ? input : input.split(/[;,]/);
    return values.map((value) => value.trim()).filter(Boolean);
  }

  private replacePlaceholders(template: string, context: JsonRecord): string {
    return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, expression) => {
      const value = this.getContextValue(context, String(expression).trim());
      if (Array.isArray(value)) {
        return value
          .map((entry) => (typeof entry === 'string' || typeof entry === 'number' ? String(entry) : ''))
          .filter(Boolean)
          .join(', ');
      }

      if (value === null || value === undefined) {
        return '';
      }

      if (value instanceof Date) {
        return value.toISOString();
      }

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }

      return '';
    });
  }

  private getContextValue(context: JsonRecord, expression: string): unknown {
    return expression.split('.').reduce<unknown>((current, key) => {
      if (Array.isArray(current)) {
        return current.flatMap((entry) => {
          const value = this.resolveContextSegment(entry, key);

          if (Array.isArray(value)) {
            return value;
          }

          return value === undefined || value === null ? [] : [value];
        });
      }

      return this.resolveContextSegment(current, key);
    }, context);
  }

  private resolveContextSegment(current: unknown, key: string): unknown {
    if (Array.isArray(current)) {
      return current.flatMap((entry) => {
        const value = this.resolveContextSegment(entry, key);

        if (Array.isArray(value)) {
          return value;
        }

        return value === undefined || value === null ? [] : [value];
      });
    }

    if (!isRecord(current)) {
      return undefined;
    }

    return current[key];
  }

  private renderMarkdown(markdown: string): string {
    const escaped = escapeHtml(markdown);
    const withLinks = escaped.replace(
      /\[(.*?)\]\((.*?)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
    const withBold = withLinks.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    const withItalic = withBold.replace(/\*(.*?)\*/g, '<em>$1</em>');
    const paragraphs = withItalic
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => `<p>${block.replace(/\n/g, '<br>')}</p>`);

    return paragraphs.join('');
  }

  private async ensureStatus(
    em: EntityManager,
    handle: string,
  ): Promise<EmailDeliveryStatusItem> {
    const existing = await em.findOne(EmailDeliveryStatusItem, { handle });
    if (existing) {
      return existing;
    }

    const created = new EmailDeliveryStatusItem();
    created.handle = handle;

    switch (handle) {
      case 'success':
        created.description = 'Success';
        created.icon = 'mdi-email-check-outline';
        created.color = '#4CAF50';
        break;
      case 'failed':
        created.description = 'Failed';
        created.icon = 'mdi-email-remove-outline';
        created.color = '#F44336';
        break;
      default:
        created.description = 'Pending';
        created.icon = 'mdi-email-fast-outline';
        created.color = '#FF9800';
        break;
    }

    await em.persist(created).flush();
    return created;
  }

  private async loadAttachments(
    em: EntityManager,
    handles: number[],
  ): Promise<MailAttachment[]> {
    if (handles.length === 0) {
      return [];
    }

    const documents = await em.find(
      DocumentItem,
      { handle: { $in: handles } },
      { populate: ['entity'] },
    );

    return documents.map((document) => ({
      handle: document.handle ?? 0,
      filename: document.filename,
      mimetype: document.mimetype,
      filePath: path.join(
        __dirname,
        '../../../storage',
        document.entity.handle,
        document.path,
      ),
    }));
  }

  private async sendWithProvider(
    delivery: EmailDeliveryItem,
    attachments: MailAttachment[],
    em: EntityManager,
  ): Promise<SendResult> {
    const session = delivery.createdBy.session;
    if (!session) {
      throw new BadRequestException('mail.sessionNotFound');
    }

    switch (delivery.provider) {
      case 'azure':
        return this.sendAzureMessage(delivery, session, attachments);
      case 'google':
        return this.sendGoogleMessage(delivery, session, attachments, em);
      default:
        throw new BadRequestException('mail.providerNotSupported');
    }
  }

  private async sendAzureMessage(
    delivery: EmailDeliveryItem,
    session: PersonSessionItem,
    attachments: MailAttachment[],
  ): Promise<SendResult> {
    const client = Client.init({
      authProvider: (done) => {
        done(null, session.accessToken);
      },
    });

    await client.api('/me/sendMail').post({
      message: {
        subject: delivery.subject,
        body: {
          contentType: 'HTML',
          content: delivery.bodyHtml,
        },
        toRecipients: delivery.toRecipients.map((address) => ({
          emailAddress: { address },
        })),
        ccRecipients: (delivery.ccRecipients ?? []).map((address) => ({
          emailAddress: { address },
        })),
        bccRecipients: (delivery.bccRecipients ?? []).map((address) => ({
          emailAddress: { address },
        })),
        attachments: attachments.map((attachment) => ({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: attachment.filename,
          contentType: attachment.mimetype,
          contentBytes: fs.readFileSync(attachment.filePath).toString('base64'),
        })),
      },
      saveToSentItems: true,
    });

    return {
      responseStatusCode: 202,
      responseBody: {
        provider: 'azure',
        recipientCount:
          delivery.toRecipients.length +
          (delivery.ccRecipients?.length ?? 0) +
          (delivery.bccRecipients?.length ?? 0),
      },
    };
  }

  private async sendGoogleMessage(
    delivery: EmailDeliveryItem,
    session: PersonSessionItem,
    attachments: MailAttachment[],
    em: EntityManager,
  ): Promise<SendResult> {
    const auth = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID || undefined,
      GOOGLE_CLIENT_SECRET || undefined,
      GOOGLE_CALLBACK_URL || undefined,
    );

    auth.setCredentials({
      access_token: session.accessToken,
      refresh_token: session.refreshToken || undefined,
    });

    if (session.refreshToken) {
      try {
        const refreshed = await auth.refreshAccessToken();
        const nextAccessToken = refreshed.credentials.access_token;
        if (nextAccessToken) {
          session.accessToken = nextAccessToken;
          auth.setCredentials({
            access_token: nextAccessToken,
            refresh_token: session.refreshToken,
          });
          if (session.handle) {
            await em.nativeUpdate(
              PersonSessionItem,
              { handle: session.handle },
              { accessToken: nextAccessToken },
            );
          }
        }
      } catch (error) {
        this.logger.warn(`Google access token refresh failed: ${String(error)}`);
      }
    }

    const gmail = google.gmail({ version: 'v1', auth });
    const rawMessage = this.buildMimeMessage(delivery, attachments);
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: Buffer.from(rawMessage, 'utf8')
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/g, ''),
      },
    });

    return {
      responseStatusCode: 200,
      responseBody: toPersistedObject(result.data) ?? { provider: 'google' },
      providerMessageId: result.data.id ?? undefined,
    };
  }

  private buildMimeMessage(
    delivery: EmailDeliveryItem,
    attachments: MailAttachment[],
  ): string {
    const mixedBoundary = `mixed_${Date.now()}`;
    const alternativeBoundary = `alt_${Date.now()}`;
    const headers = [
      `To: ${delivery.toRecipients.join(', ')}`,
      ...(delivery.ccRecipients?.length ? [`Cc: ${delivery.ccRecipients.join(', ')}`] : []),
      ...(delivery.bccRecipients?.length ? [`Bcc: ${delivery.bccRecipients.join(', ')}`] : []),
      `Subject: ${this.encodeMimeHeader(delivery.subject)}`,
      'MIME-Version: 1.0',
      attachments.length > 0
        ? `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`
        : `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
      '',
    ];

    const alternativeBody = [
      `--${alternativeBoundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      this.stripMarkdown(delivery.bodyMarkdown),
      '',
      `--${alternativeBoundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      delivery.bodyHtml,
      '',
      `--${alternativeBoundary}--`,
      '',
    ].join('\r\n');

    if (attachments.length === 0) {
      return `${headers.join('\r\n')}${alternativeBody}`;
    }

    const parts = [
      `--${mixedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
      '',
      alternativeBody,
    ];

    for (const attachment of attachments) {
      const content = fs.readFileSync(attachment.filePath).toString('base64');
      parts.push(
        `--${mixedBoundary}`,
        `Content-Type: ${attachment.mimetype}; name="${this.escapeMimeValue(attachment.filename)}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${this.escapeMimeValue(attachment.filename)}"`,
        '',
        content,
        '',
      );
    }

    parts.push(`--${mixedBoundary}--`, '');

    return `${headers.join('\r\n')}${parts.join('\r\n')}`;
  }

  private encodeMimeHeader(value: string): string {
    return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
  }

  private escapeMimeValue(value: string): string {
    return value.replace(/"/g, '');
  }

  private stripMarkdown(markdown: string): string {
    return markdown
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1');
  }
}