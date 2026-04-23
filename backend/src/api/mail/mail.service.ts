import { InjectQueue } from '@nestjs/bullmq';
import { EntityManager, type EntityName } from '@mikro-orm/core';
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

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/\n/g, ' ');
}

function tokenizeTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

function isTableSeparatorLine(line: string): boolean {
  const cells = tokenizeTableRow(line);

  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isHorizontalRuleLine(line: string): boolean {
  return /^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line);
}

function renderInlineMarkdown(value: string): string {
  const placeholders: string[] = [];
  const protect = (html: string): string =>
    `@@SAPLINGPLACEHOLDER${placeholders.push(html) - 1}@@`;

  let rendered = escapeHtml(value);

  rendered = rendered.replace(/`([^`]+)`/g, (_match, code: string) =>
    protect(`<code>${escapeHtml(code)}</code>`),
  );
  rendered = rendered.replace(
    /!\[([^\]]*)\]\(([^)\s]+(?:\s+"[^"]*")?)\)/g,
    (_match, alt: string, url: string) =>
      protect(
        `<img src="${escapeAttribute(url.trim())}" alt="${escapeAttribute(alt)}" />`,
      ),
  );
  rendered = rendered.replace(
    /\[([^\]]+)\]\(([^)\s]+(?:\s+"[^"]*")?)\)/g,
    (_match, label: string, url: string) =>
      protect(
        `<a href="${escapeAttribute(url.trim())}" target="_blank" rel="noopener noreferrer">${renderInlineMarkdown(label)}</a>`,
      ),
  );
  rendered = rendered.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  rendered = rendered.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  rendered = rendered.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  rendered = rendered.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>');

  return rendered.replace(
    /@@SAPLINGPLACEHOLDER(\d+)@@/g,
    (_match, index: string) => {
      const placeholder = placeholders[Number(index)];
      return placeholder ?? '';
    },
  );
}

function renderMarkdownBlocks(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const html: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const currentLine = lines[index] ?? '';
    const trimmedLine = currentLine.trim();

    if (!trimmedLine) {
      index += 1;
      continue;
    }

    const fenceMatch = currentLine.match(/^```([\w-]+)?\s*$/);
    if (fenceMatch) {
      const language = fenceMatch[1]?.trim();
      const codeLines: string[] = [];

      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index] ?? '')) {
        codeLines.push(lines[index] ?? '');
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      const className = language
        ? ` class="language-${escapeAttribute(language)}"`
        : '';
      html.push(
        `<pre><code${className}>${escapeHtml(codeLines.join('\n'))}</code></pre>`,
      );
      continue;
    }

    const headingMatch = currentLine.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      html.push(
        `<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`,
      );
      index += 1;
      continue;
    }

    if (isHorizontalRuleLine(currentLine)) {
      html.push('<hr>');
      index += 1;
      continue;
    }

    if (/^>\s?/.test(currentLine)) {
      const quoteLines: string[] = [];

      while (index < lines.length && /^>\s?/.test(lines[index] ?? '')) {
        quoteLines.push((lines[index] ?? '').replace(/^>\s?/, ''));
        index += 1;
      }

      html.push(
        `<blockquote>${renderMarkdownBlocks(quoteLines.join('\n'))}</blockquote>`,
      );
      continue;
    }

    const nextLine = lines[index + 1] ?? '';
    if (currentLine.includes('|') && isTableSeparatorLine(nextLine)) {
      const headerCells = tokenizeTableRow(currentLine);
      const bodyRows: string[][] = [];

      index += 2;
      while (index < lines.length && (lines[index] ?? '').includes('|')) {
        bodyRows.push(tokenizeTableRow(lines[index] ?? ''));
        index += 1;
      }

      const head = `<thead><tr>${headerCells
        .map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`)
        .join('')}</tr></thead>`;
      const body = bodyRows.length
        ? `<tbody>${bodyRows
            .map(
              (row) =>
                `<tr>${row.map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`).join('')}</tr>`,
            )
            .join('')}</tbody>`
        : '';

      html.push(`<table>${head}${body}</table>`);
      continue;
    }

    if (/^- \[[ xX]\]\s+/.test(currentLine)) {
      const items: string[] = [];

      while (
        index < lines.length &&
        /^- \[[ xX]\]\s+/.test(lines[index] ?? '')
      ) {
        const match = (lines[index] ?? '').match(/^- \[([ xX])\]\s+(.*)$/);
        const checked = (match?.[1] ?? ' ').toLowerCase() === 'x';
        const content = renderInlineMarkdown(match?.[2] ?? '');
        items.push(
          `<li class="task-list-item"><input type="checkbox" disabled${checked ? ' checked' : ''}> ${content}</li>`,
        );
        index += 1;
      }

      html.push(`<ul class="contains-task-list">${items.join('')}</ul>`);
      continue;
    }

    if (/^-\s+/.test(currentLine)) {
      const items: string[] = [];

      while (index < lines.length && /^-\s+/.test(lines[index] ?? '')) {
        const content = (lines[index] ?? '').replace(/^-\s+/, '');
        items.push(`<li>${renderInlineMarkdown(content)}</li>`);
        index += 1;
      }

      html.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(currentLine)) {
      const items: string[] = [];

      while (index < lines.length && /^\d+\.\s+/.test(lines[index] ?? '')) {
        const content = (lines[index] ?? '').replace(/^\d+\.\s+/, '');
        items.push(`<li>${renderInlineMarkdown(content)}</li>`);
        index += 1;
      }

      html.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    const paragraphLines: string[] = [];

    while (index < lines.length) {
      const paragraphLine = lines[index] ?? '';
      const paragraphTrimmed = paragraphLine.trim();

      if (!paragraphTrimmed) {
        break;
      }

      if (
        /^```([\w-]+)?\s*$/.test(paragraphLine) ||
        /^(#{1,6})\s+/.test(paragraphLine) ||
        /^>\s?/.test(paragraphLine) ||
        isHorizontalRuleLine(paragraphLine) ||
        /^- \[[ xX]\]\s+/.test(paragraphLine) ||
        /^-\s+/.test(paragraphLine) ||
        /^\d+\.\s+/.test(paragraphLine) ||
        (paragraphLine.includes('|') &&
          isTableSeparatorLine(lines[index + 1] ?? ''))
      ) {
        break;
      }

      paragraphLines.push(paragraphLine);
      index += 1;
    }

    html.push(
      `<p>${paragraphLines.map((line) => renderInlineMarkdown(line)).join('<br>')}</p>`,
    );
  }

  return html.join('');
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
    const bodySource = previewDto.bodyMarkdown ?? template?.bodyMarkdown ?? '';

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

    return await this.em.findOneOrFail(EmailDeliveryItem, {
      handle: delivery.handle,
    });
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
      const result = await this.sendWithProvider(delivery, attachments);
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
      ? await this.loadEntityContext(
          previewDto.entityHandle,
          previewDto.itemHandle,
        )
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
    const entityClass = ENTITY_MAP[entityHandle] as
      | EntityName<object>
      | undefined;
    if (!entityClass) {
      throw new NotFoundException('global.entityNotFound');
    }

    const template = this.templateService.getEntityTemplate(entityHandle);
    const populate = template
      .filter((entry) => entry.isReference)
      .map((entry) => entry.name);
    const normalizedHandle = this.normalizeHandleValue(itemHandle);
    const item = await this.em.findOne(
      entityClass,
      { handle: normalizedHandle },
      { populate: populate as any[] },
    );

    if (!item) {
      throw new NotFoundException('global.entryNotFound');
    }

    return item;
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
          .map((entry) =>
            typeof entry === 'string' || typeof entry === 'number'
              ? String(entry)
              : '',
          )
          .filter(Boolean)
          .join(', ');
      }

      if (value === null || value === undefined) {
        return '';
      }

      if (value instanceof Date) {
        return value.toISOString();
      }

      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        return String(value);
      }

      return '';
    });
  }

  private getContextValue(context: JsonRecord, expression: string): unknown {
    return expression.split('.').reduce<unknown>((current, key) => {
      if (Array.isArray(current)) {
        const entries = current as unknown[];

        return entries.flatMap((entry) => {
          const value = this.resolveContextSegment(entry, key);

          if (Array.isArray(value)) {
            return value as unknown[];
          }

          return value === undefined || value === null ? [] : [value];
        });
      }

      return this.resolveContextSegment(current, key);
    }, context);
  }

  private resolveContextSegment(current: unknown, key: string): unknown {
    if (Array.isArray(current)) {
      const entries = current as unknown[];

      return entries.flatMap((entry) => {
        const value = this.resolveContextSegment(entry, key);

        if (Array.isArray(value)) {
          return value as unknown[];
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
    return renderMarkdownBlocks(markdown ?? '');
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
  ): Promise<SendResult> {
    const session = delivery.createdBy.session;
    if (!session) {
      throw new BadRequestException('mail.sessionNotFound');
    }

    switch (delivery.provider) {
      case 'azure':
        return this.sendAzureMessage(delivery, session, attachments);
      case 'google':
        return this.sendGoogleMessage(delivery, session, attachments);
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
        }
      } catch (error) {
        this.logger.warn(
          `Google access token refresh failed: ${String(error)}`,
        );
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
      ...(delivery.ccRecipients?.length
        ? [`Cc: ${delivery.ccRecipients.join(', ')}`]
        : []),
      ...(delivery.bccRecipients?.length
        ? [`Bcc: ${delivery.bccRecipients.join(', ')}`]
        : []),
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
    return this.htmlToPlainText(this.renderMarkdown(markdown));
  }

  private htmlToPlainText(html: string): string {
    return this.decodeHtmlEntities(
      html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<li[^>]*>/gi, '- ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|blockquote|pre|tr)>/gi, '\n')
        .replace(/<\/(ul|ol|table|thead|tbody)>/gi, '\n')
        .replace(/<t[dh][^>]*>/gi, '')
        .replace(/<\/t[dh]>/gi, '\t')
        .replace(/<[^>]+>/g, '')
        .replace(/\t\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .split('\n')
        .map((line) => line.trimEnd())
        .join('\n')
        .trim(),
    );
  }

  private decodeHtmlEntities(value: string): string {
    return value
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#(\d+);/g, (_match, code) =>
        String.fromCodePoint(Number(code)),
      )
      .replace(/&#x([\da-f]+);/gi, (_match, code) =>
        String.fromCodePoint(parseInt(String(code), 16)),
      );
  }
}
