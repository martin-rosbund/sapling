import { InjectQueue } from '@nestjs/bullmq';
import { EntityManager } from '@mikro-orm/core';
import type { RequiredEntityData } from '@mikro-orm/core';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import axios from 'axios';
import { Client } from '@microsoft/microsoft-graph-client';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { TemplateService } from '../template/template.service';
import { MessageTemplateService } from '../template/message-template.service';
import { renderMarkdownBlocks } from './markdown.util';
import { buildMimeMessage } from './mail-mime.util';
import {
  buildFallbackSenderOptions,
  buildPersonDisplayName,
  buildStandaloneSenderOption,
  extractProviderHandle,
  getAssignedSharedMailboxSenders,
  isSupportedMailProvider,
  mergeSenderOptions,
  parseSupportedProvider,
  pushSenderOption,
  type MailSenderOption,
} from './mail-sender-options.util';
import { EmailTemplateItem } from '../../entity/EmailTemplateItem';
import { PersonItem } from '../../entity/PersonItem';
import {
  MailSenderListResponseDto,
  MailPreviewDto,
  MailPreviewResponseDto,
  MailSendDto,
} from './dto/mail.dto';
import { EmailDeliveryItem } from '../../entity/EmailDeliveryItem';
import { EmailDeliveryStatusItem } from '../../entity/EmailDeliveryStatusItem';
import { EntityItem } from '../../entity/EntityItem';
import { DocumentItem } from '../../entity/DocumentItem';
import { PersonSessionItem } from '../../entity/PersonSessionItem';
import { CompanyItem } from '../../entity/CompanyItem';
import { EventItem } from '../../entity/EventItem';
import { EventStatusItem } from '../../entity/EventStatusItem';
import { EventTypeItem } from '../../entity/EventTypeItem';
import { TicketItem } from '../../entity/TicketItem';
import { SalesOpportunityItem } from '../../entity/SalesOpportunityItem';
import {
  AZURE_AD_CLIENT_ID,
  AZURE_AD_CLIENT_SECRET,
  AZURE_AD_SCOPE,
  AZURE_AD_TENNANT_ID,
  GOOGLE_CALLBACK_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIS_ENABLED,
} from '../../constants/project.constants';
import {
  buildMailEventDescription,
  buildMailEventTitle,
  getMailProviderErrorShape,
  isAuthenticationProviderError,
  isRecord,
  normalizeDisplayName,
  normalizeEmailAddress,
  toPersistedObject,
  type JsonRecord,
  type MailAttachment,
  type SendResult,
  type SupportedMailProvider,
} from './mail-delivery.util';

const MAIL_EVENT_DURATION_MINUTES = 5;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly templateService: TemplateService,
    private readonly messageTemplateService: MessageTemplateService,
    @InjectQueue('emails') private readonly emailQueue: Queue,
  ) {}

  async listSenderOptions(
    currentUser: PersonItem,
  ): Promise<MailSenderListResponseDto> {
    const person = await this.loadCurrentMailPerson(currentUser);
    if (!person) {
      return { senders: [] };
    }

    const provider = extractProviderHandle(person);
    const fallbackSenders = buildFallbackSenderOptions(person, provider);

    if (!isSupportedMailProvider(provider) || !person.session) {
      return {
        provider,
        senders: fallbackSenders,
      };
    }

    const senders = await this.listAvailableSendersForProvider(
      provider,
      person,
      person.session,
    );

    return {
      provider,
      senders: senders.length > 0 ? senders : fallbackSenders,
    };
  }

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
    const renderOptions = {
      entityHandle: previewDto.entityHandle,
      locale: previewDto.clientLocale,
      timeZone: previewDto.clientTimeZone,
      currentUser,
    };

    const subject = this.replacePlaceholders(
      subjectSource,
      context,
      renderOptions,
    );
    const bodyMarkdown = this.replacePlaceholders(
      bodySource,
      context,
      renderOptions,
    );

    return {
      entityHandle: previewDto.entityHandle,
      itemHandle: previewDto.itemHandle,
      templateHandle: previewDto.templateHandle,
      senderEmail:
        normalizeEmailAddress(previewDto.senderEmail) ??
        normalizeEmailAddress(currentUser.email) ??
        '',
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

    const resolvedSender = await this.resolveRequestedSender(
      currentUser,
      sendDto.senderEmail,
    );

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
      from: resolvedSender?.email,
      requestedFrom: normalizeEmailAddress(sendDto.senderEmail),
      senderDisplayName: resolvedSender?.displayName,
      senderProvider: resolvedSender?.provider,
      senderSource: resolvedSender?.source,
      usesConfiguredSharedMailbox: resolvedSender?.source === 'configured',
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
      const result = await this.sendWithProvider(delivery, attachments, em);
      const success = await this.ensureStatus(em, 'success');
      delivery.status = success;
      delivery.responseStatusCode = result.responseStatusCode;
      delivery.responseBody = result.responseBody;
      delivery.responseHeaders = result.responseHeaders;
      delivery.providerMessageId = result.providerMessageId;
      delivery.completedAt = new Date();
      await em.flush();
      await this.createMailFollowUpEvent(em, delivery);
      return delivery;
    } catch (error) {
      const failed = await this.ensureStatus(em, 'failed');
      const providerError = getMailProviderErrorShape(error);

      delivery.status = failed;
      delivery.responseStatusCode = providerError.statusCode ?? 500;
      delivery.responseBody = {
        message: providerError.message ?? 'Unknown error',
        senderEmail: this.getRequestedSenderEmail(delivery),
        senderSource: this.getRequestedSenderSource(delivery),
        providerError: toPersistedObject(providerError.body),
      };
      delivery.responseHeaders = toPersistedObject(providerError.headers);
      delivery.completedAt = new Date();
      await em.flush();
      throw error;
    }
  }

  async retryDelivery(handle: number): Promise<EmailDeliveryItem> {
    const pending = await this.ensureStatus(this.em, 'pending');
    const delivery = await this.em.findOne(EmailDeliveryItem, { handle });

    if (!delivery) {
      throw new NotFoundException('mail.deliveryNotFound');
    }

    delivery.status = pending;
    delivery.nextRetryAt = undefined;
    delivery.completedAt = undefined;
    delivery.responseStatusCode = undefined;
    delivery.responseBody = undefined;
    delivery.responseHeaders = undefined;
    delivery.providerMessageId = undefined;

    await this.em.flush();

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

  private async resolveContext(
    previewDto: MailPreviewDto,
    currentUser: PersonItem,
  ): Promise<JsonRecord> {
    return await this.messageTemplateService.buildContext({
      entityHandle: previewDto.entityHandle,
      itemHandle: previewDto.itemHandle,
      currentUser,
      draftValues: previewDto.draftValues,
    });
  }

  private async loadEntityContext(
    entityHandle: string,
    itemHandle: string | number,
  ): Promise<JsonRecord> {
    return await this.messageTemplateService.loadEntityContext(
      entityHandle,
      itemHandle,
    );
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
    return this.messageTemplateService.replaceRecipients(input, context);
  }

  private normalizeRecipients(input: string[] | string | undefined): string[] {
    if (!input) {
      return [];
    }

    const values = Array.isArray(input) ? input : input.split(/[;,]/);
    return values.map((value) => value.trim()).filter(Boolean);
  }

  private replacePlaceholders(
    template: string,
    context: JsonRecord,
    renderOptions?: {
      entityHandle?: string;
      locale?: string;
      timeZone?: string;
      currentUser?: PersonItem;
    },
  ): string {
    return this.messageTemplateService.replacePlaceholders(
      template,
      context,
      renderOptions,
    );
  }

  private getContextValue(context: JsonRecord, expression: string): unknown {
    return this.messageTemplateService.getContextValue(context, expression);
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
    return renderMarkdownBlocks(markdown);
  }

  /**
   * Creates a follow-up calendar event after a successful email dispatch,
   * mirroring the behaviour of PhoneCallController for phone calls.
   * Errors are logged but never propagated, so they cannot break the send pipeline.
   */
  private async createMailFollowUpEvent(
    em: EntityManager,
    delivery: EmailDeliveryItem,
  ): Promise<void> {
    try {
      const eventEm = em.fork();
      const creator = await eventEm.findOne(
        PersonItem,
        { handle: delivery.createdBy?.handle },
        { populate: ['company'] },
      );

      if (!creator) {
        this.logger.warn(
          `mailService - createMailFollowUpEvent - missing creator for delivery ${delivery.handle}`,
        );
        return;
      }

      const eventTypeRef = eventEm.getReference(EventTypeItem, 'mail' as never);
      const eventStatusRef = eventEm.getReference(
        EventStatusItem,
        'completed' as never,
      );

      const startDate = delivery.completedAt ?? new Date();
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + MAIL_EVENT_DURATION_MINUTES);

      const creatorCompanyRef =
        creator.company?.handle != null
          ? eventEm.getReference(CompanyItem, creator.company.handle as never)
          : undefined;
      const creatorPersonRef =
        creator.handle != null
          ? eventEm.getReference(PersonItem, creator.handle as never)
          : undefined;

      const sourceRefs = await this.resolveMailEventSourceRefs(
        eventEm,
        delivery,
        creatorCompanyRef,
        creatorPersonRef,
      );

      const event = eventEm.create(EventItem, {
        title: buildMailEventTitle(delivery),
        description: buildMailEventDescription(delivery),
        startDate,
        endDate,
        isAllDay: false,
        onlineMeetingURL: '',
        type: eventTypeRef,
        status: eventStatusRef,
        assigneeCompany: creatorCompanyRef,
        assigneePerson: creatorPersonRef,
        creatorCompany: sourceRefs.creatorCompanyRef,
        creatorPerson: sourceRefs.creatorPersonRef,
        ticket: sourceRefs.ticketRef,
        salesOpportunity: sourceRefs.salesOpportunityRef,
      } as RequiredEntityData<EventItem>);

      await this.attachMailEventParticipants(
        eventEm,
        event,
        creatorPersonRef,
        sourceRefs.sourcePersonRef,
        delivery.toRecipients ?? [],
      );

      eventEm.persist(event);
      await eventEm.flush();
    } catch (error) {
      this.logger.error(
        `mailService - createMailFollowUpEvent - failed for delivery ${delivery.handle}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Resolves the ticket / sales opportunity / person source references for a
   * mail follow-up event. If the delivery originated from a person record the
   * resolved creator company / person references are overridden with the
   * source person's company and the source person is returned for participant
   * attachment.
   */
  private async resolveMailEventSourceRefs(
    eventEm: EntityManager,
    delivery: EmailDeliveryItem,
    defaultCreatorCompanyRef: CompanyItem | undefined,
    defaultCreatorPersonRef: PersonItem | undefined,
  ): Promise<{
    creatorCompanyRef: CompanyItem | undefined;
    creatorPersonRef: PersonItem | undefined;
    sourcePersonRef: PersonItem | null;
    ticketRef?: TicketItem;
    salesOpportunityRef?: SalesOpportunityItem;
  }> {
    let creatorCompanyRef = defaultCreatorCompanyRef;
    let creatorPersonRef = defaultCreatorPersonRef;
    let sourcePersonRef: PersonItem | null = null;
    let ticketRef: TicketItem | undefined;
    let salesOpportunityRef: SalesOpportunityItem | undefined;

    const sourceEntityHandle = delivery.entity?.handle;
    const sourceReferenceHandle = delivery.referenceHandle;
    const hasSourceReference =
      sourceReferenceHandle != null && sourceReferenceHandle !== '';

    if (sourceEntityHandle === 'ticket' && hasSourceReference) {
      const ticketHandle = Number(sourceReferenceHandle);
      if (Number.isFinite(ticketHandle)) {
        ticketRef = eventEm.getReference(TicketItem, ticketHandle as never);
      }
    } else if (
      sourceEntityHandle === 'salesOpportunity' &&
      hasSourceReference
    ) {
      const salesOpportunityHandle = Number(sourceReferenceHandle);
      if (Number.isFinite(salesOpportunityHandle)) {
        salesOpportunityRef = eventEm.getReference(
          SalesOpportunityItem,
          salesOpportunityHandle as never,
        );
      }
    }

    if (sourceEntityHandle === 'person' && hasSourceReference) {
      const sourcePersonHandle = Number(sourceReferenceHandle);
      if (Number.isFinite(sourcePersonHandle)) {
        const sourcePerson = await eventEm.findOne(
          PersonItem,
          { handle: sourcePersonHandle },
          { populate: ['company'] },
        );

        if (sourcePerson?.handle != null) {
          creatorPersonRef = eventEm.getReference(
            PersonItem,
            sourcePerson.handle as never,
          );
          if (sourcePerson.company?.handle != null) {
            creatorCompanyRef = eventEm.getReference(
              CompanyItem,
              sourcePerson.company.handle as never,
            );
          }
          sourcePersonRef = creatorPersonRef;
        }
      }
    }

    return {
      creatorCompanyRef,
      creatorPersonRef,
      sourcePersonRef,
      ticketRef,
      salesOpportunityRef,
    };
  }

  /**
   * Attaches the creator, all recipient persons (resolved by e-mail address)
   * and the source person (if different) as participants on the follow-up
   * event.
   */
  private async attachMailEventParticipants(
    eventEm: EntityManager,
    event: EventItem,
    creatorPersonRef: PersonItem | undefined,
    sourcePersonRef: PersonItem | null,
    recipientEmails: string[],
  ): Promise<void> {
    if (creatorPersonRef) {
      event.participants.add(creatorPersonRef);
    }

    const recipientPersons = await this.findPersonsByEmails(
      eventEm,
      recipientEmails,
    );
    for (const person of recipientPersons) {
      if (person.handle != null) {
        event.participants.add(
          eventEm.getReference(PersonItem, person.handle as never),
        );
      }
    }

    if (sourcePersonRef) {
      event.participants.add(sourcePersonRef);
    }
  }

  /**
   * Resolves PersonItems whose `email` matches one of the provided addresses.
   * Used to attach mail recipients as participants on the follow-up event.
   */
  private async findPersonsByEmails(
    em: EntityManager,
    emails: string[],
  ): Promise<PersonItem[]> {
    const normalized = Array.from(
      new Set(
        emails
          .map((email) => normalizeEmailAddress(email))
          .filter((value): value is string => Boolean(value)),
      ),
    );

    if (normalized.length === 0) {
      return [];
    }

    return await em.find(PersonItem, { email: { $in: normalized } });
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
    em: EntityManager = this.em,
  ): Promise<SendResult> {
    const session = delivery.createdBy.session;
    if (!session) {
      throw new BadRequestException('mail.sessionNotFound');
    }

    const provider = parseSupportedProvider(delivery.provider);
    if (!provider) {
      throw new BadRequestException('mail.providerNotSupported');
    }

    const senderEmail = this.getRequestedSenderEmail(delivery);
    const initialAccessToken = session.accessToken;

    try {
      return await this.sendWithProviderAccessToken(
        provider,
        delivery,
        session,
        initialAccessToken,
        attachments,
        senderEmail,
      );
    } catch (error) {
      if (!isAuthenticationProviderError(error)) {
        throw error;
      }

      const refreshedToken = await this.refreshProviderAccessToken(
        provider,
        session,
        em,
      );

      if (!refreshedToken || refreshedToken === initialAccessToken) {
        throw error;
      }

      return this.sendWithProviderAccessToken(
        provider,
        delivery,
        session,
        refreshedToken,
        attachments,
        senderEmail,
      );
    }
  }

  private async sendWithProviderAccessToken(
    provider: SupportedMailProvider,
    delivery: EmailDeliveryItem,
    session: PersonSessionItem,
    accessToken: string,
    attachments: MailAttachment[],
    senderEmail?: string,
  ): Promise<SendResult> {
    if (provider === 'azure') {
      return this.sendAzureMessage(
        delivery,
        accessToken,
        attachments,
        senderEmail,
      );
    }

    return this.sendGoogleMessage(
      delivery,
      session,
      attachments,
      accessToken,
      senderEmail,
    );
  }

  private async sendAzureMessage(
    delivery: EmailDeliveryItem,
    accessToken: string,
    attachments: MailAttachment[],
    senderEmail?: string,
  ): Promise<SendResult> {
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });

    await client.api('/me/sendMail').post({
      message: {
        ...(senderEmail
          ? {
              from: {
                emailAddress: {
                  address: senderEmail,
                },
              },
            }
          : {}),
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
        senderEmail,
        saveToSentItems: true,
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
    accessToken: string,
    senderEmail?: string,
  ): Promise<SendResult> {
    const auth = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID || undefined,
      GOOGLE_CLIENT_SECRET || undefined,
      GOOGLE_CALLBACK_URL || undefined,
    );

    auth.setCredentials({
      access_token: accessToken,
      refresh_token: session.refreshToken || undefined,
    });

    const gmail = google.gmail({ version: 'v1', auth });
    const rawMessage = buildMimeMessage(
      delivery,
      attachments,
      this.messageTemplateService.stripMarkdown(delivery.bodyMarkdown),
      senderEmail,
    );
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
      responseHeaders: toPersistedObject(
        isRecord(result) ? result.headers : undefined,
      ),
      providerMessageId: result.data.id ?? undefined,
    };
  }

  private async loadCurrentMailPerson(
    currentUser: PersonItem,
  ): Promise<PersonItem | null> {
    if (currentUser.handle == null) {
      return null;
    }

    return this.em.findOne(
      PersonItem,
      { handle: currentUser.handle },
      {
        populate: [
          'session',
          'type',
          'sharedMailboxGroups',
          'sharedMailboxGroups.items',
          'sharedMailboxGroups.items.provider',
        ],
      },
    );
  }

  private async listAvailableSendersForProvider(
    provider: SupportedMailProvider,
    person: PersonItem,
    session: PersonSessionItem,
  ): Promise<MailSenderOption[]> {
    const assignedSharedMailboxes = getAssignedSharedMailboxSenders(
      person,
      provider,
    );

    if (provider === 'azure') {
      const discoveredSenders = await this.listAzureSenderOptions(
        person,
        session,
      );
      return mergeSenderOptions(discoveredSenders, assignedSharedMailboxes);
    }

    const discoveredSenders = await this.listGoogleSenderOptions(
      person,
      session,
    );
    return mergeSenderOptions(discoveredSenders, assignedSharedMailboxes);
  }

  private async resolveRequestedSender(
    currentUser: PersonItem,
    requestedSenderEmail: string | undefined,
  ): Promise<MailSenderOption | undefined> {
    const normalizedRequested = normalizeEmailAddress(requestedSenderEmail);
    const person = await this.loadCurrentMailPerson(currentUser);

    if (!person) {
      return buildStandaloneSenderOption(
        normalizedRequested ?? normalizeEmailAddress(currentUser.email),
        extractProviderHandle(currentUser) ?? 'sapling',
        buildPersonDisplayName(currentUser),
      );
    }

    const provider = extractProviderHandle(person);
    if (!isSupportedMailProvider(provider) || !person.session) {
      return buildStandaloneSenderOption(
        normalizedRequested ?? normalizeEmailAddress(person.email),
        provider ?? 'sapling',
        buildPersonDisplayName(person),
      );
    }

    const senders = await this.listAvailableSendersForProvider(
      provider,
      person,
      person.session,
    );

    if (senders.length === 0) {
      return buildStandaloneSenderOption(
        normalizedRequested ?? normalizeEmailAddress(person.email),
        provider,
        buildPersonDisplayName(person),
      );
    }

    if (!normalizedRequested) {
      return senders.find((sender) => sender.isDefault) ?? senders[0];
    }

    const matchedSender = senders.find(
      (sender) =>
        sender.email.trim().toLowerCase() ===
        normalizedRequested.trim().toLowerCase(),
    );

    if (!matchedSender) {
      throw new BadRequestException('mail.senderNotAllowed');
    }

    return matchedSender;
  }

  private async listAzureSenderOptions(
    person: PersonItem,
    session: PersonSessionItem,
  ): Promise<MailSenderOption[]> {
    const accessToken = await this.resolveActiveAccessToken('azure', session);
    if (!accessToken) {
      return buildFallbackSenderOptions(person, 'azure');
    }

    const client = Client.init({
      authProvider: (done) => done(null, accessToken),
    });

    const profile = (await client
      .api('/me')
      .select('displayName,mail,userPrincipalName,otherMails,proxyAddresses')
      .get()) as JsonRecord;
    const personDisplayName =
      `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() || undefined;
    const displayName =
      normalizeDisplayName(String(profile.displayName)) ?? personDisplayName;
    const primaryEmail =
      normalizeEmailAddress(String(profile.mail)) ??
      normalizeEmailAddress(String(profile.userPrincipalName)) ??
      normalizeEmailAddress(person.email);
    const senders: MailSenderOption[] = [];

    pushSenderOption(
      senders,
      primaryEmail,
      displayName,
      'azure',
      'primary',
      true,
    );

    pushSenderOption(
      senders,
      normalizeEmailAddress(person.email),
      displayName,
      'azure',
      'profile',
    );

    return senders;
  }

  private async listGoogleSenderOptions(
    person: PersonItem,
    session: PersonSessionItem,
  ): Promise<MailSenderOption[]> {
    const auth = await this.createGoogleAuthClient(session);
    const gmail = google.gmail({ version: 'v1', auth });
    const senders: MailSenderOption[] = [];

    const profileResponse = await gmail.users.getProfile({ userId: 'me' });
    const primaryEmail =
      normalizeEmailAddress(profileResponse.data.emailAddress) ??
      normalizeEmailAddress(person.email);
    const displayName =
      `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() ||
      primaryEmail ||
      undefined;

    pushSenderOption(
      senders,
      primaryEmail,
      displayName,
      'google',
      'primary',
      true,
    );

    try {
      const sendAsResponse = await gmail.users.settings.sendAs.list({
        userId: 'me',
      });
      const sendAsEntries = Array.isArray(sendAsResponse.data.sendAs)
        ? sendAsResponse.data.sendAs
        : [];

      for (const sendAs of sendAsEntries) {
        pushSenderOption(
          senders,
          normalizeEmailAddress(sendAs.sendAsEmail),
          sendAs.displayName || displayName,
          'google',
          'alias',
          !!sendAs.isPrimary,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Google sender alias lookup failed, falling back to the primary account: ${String(error)}`,
      );
    }

    pushSenderOption(
      senders,
      normalizeEmailAddress(person.email),
      displayName,
      'google',
      'profile',
    );

    return senders;
  }

  private async resolveActiveAccessToken(
    provider: SupportedMailProvider,
    session: PersonSessionItem,
    em: EntityManager = this.em,
  ): Promise<string | null> {
    const accessToken = session.accessToken?.trim();
    if (accessToken) {
      return accessToken;
    }

    return this.refreshProviderAccessToken(provider, session, em);
  }

  private async refreshProviderAccessToken(
    provider: SupportedMailProvider,
    session: PersonSessionItem,
    em: EntityManager = this.em,
  ): Promise<string | null> {
    const refreshToken = session.refreshToken?.trim();
    if (!refreshToken) {
      return null;
    }

    try {
      let nextAccessToken: string | null = null;

      if (provider === 'google') {
        const auth = new google.auth.OAuth2(
          GOOGLE_CLIENT_ID || undefined,
          GOOGLE_CLIENT_SECRET || undefined,
          GOOGLE_CALLBACK_URL || undefined,
        );

        auth.setCredentials({ refresh_token: refreshToken });
        const refreshed = await auth.refreshAccessToken();
        nextAccessToken = refreshed.credentials.access_token ?? null;
      } else {
        const tokenEndpoint = `https://login.microsoftonline.com/${AZURE_AD_TENNANT_ID || 'common'}/oauth2/v2.0/token`;
        const params = new URLSearchParams({
          client_id: AZURE_AD_CLIENT_ID,
          client_secret: AZURE_AD_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        });

        if (AZURE_AD_SCOPE.length > 0) {
          params.set('scope', AZURE_AD_SCOPE.join(' '));
        }

        const response = await axios.post<{ access_token?: string }>(
          tokenEndpoint,
          params.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        );
        nextAccessToken = response.data.access_token ?? null;
      }

      if (nextAccessToken) {
        session.accessToken = nextAccessToken;
        await em.flush();
      }

      return nextAccessToken;
    } catch (error) {
      this.logger.warn(
        `Refreshing ${provider} access token failed: ${String(error)}`,
      );
      return null;
    }
  }

  private async createGoogleAuthClient(
    session: PersonSessionItem,
  ): Promise<InstanceType<typeof google.auth.OAuth2>> {
    const accessToken = await this.resolveActiveAccessToken('google', session);
    const auth = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID || undefined,
      GOOGLE_CLIENT_SECRET || undefined,
      GOOGLE_CALLBACK_URL || undefined,
    );

    auth.setCredentials({
      access_token: accessToken ?? undefined,
      refresh_token: session.refreshToken || undefined,
    });

    return auth;
  }

  private getRequestedSenderEmail(
    delivery: EmailDeliveryItem,
  ): string | undefined {
    if (!isRecord(delivery.requestPayload)) {
      return undefined;
    }

    return normalizeEmailAddress(
      typeof delivery.requestPayload.from === 'string'
        ? delivery.requestPayload.from
        : undefined,
    );
  }

  private getRequestedSenderSource(
    delivery: EmailDeliveryItem,
  ): string | undefined {
    if (!isRecord(delivery.requestPayload)) {
      return undefined;
    }

    return typeof delivery.requestPayload.senderSource === 'string'
      ? delivery.requestPayload.senderSource
      : undefined;
  }
}
