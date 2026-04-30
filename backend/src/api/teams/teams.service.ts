import { InjectQueue } from '@nestjs/bullmq';
import { EntityManager } from '@mikro-orm/core';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import axios from 'axios';
import { Client } from '@microsoft/microsoft-graph-client';
import {
  AZURE_AD_CLIENT_ID,
  AZURE_AD_CLIENT_SECRET,
  AZURE_AD_SCOPE,
  AZURE_AD_TENNANT_ID,
  REDIS_ENABLED,
} from '../../constants/project.constants';
import { MessageTemplateService } from '../template/message-template.service';
import { PersonItem } from '../../entity/PersonItem';
import { PersonSessionItem } from '../../entity/PersonSessionItem';
import { TeamsDeliveryItem } from '../../entity/TeamsDeliveryItem';
import { TeamsDeliveryStatusItem } from '../../entity/TeamsDeliveryStatusItem';
import { TeamsSubscriptionItem } from '../../entity/TeamsSubscriptionItem';

type JsonRecord = Record<string, unknown>;

type GraphChat = {
  id?: string;
};

type GraphMessage = {
  id?: string;
};

type GraphErrorShape = {
  statusCode?: number;
  body?: unknown;
  message?: string;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function toPersistedObject(value: unknown): object | undefined {
  return isRecord(value) ? value : undefined;
}

function getGraphErrorShape(error: unknown): GraphErrorShape {
  if (isRecord(error)) {
    return {
      statusCode:
        typeof error.statusCode === 'number' ? error.statusCode : undefined,
      body: error.body,
      message: typeof error.message === 'string' ? error.message : undefined,
    };
  }

  return {
    message: error instanceof Error ? error.message : 'Unknown error',
  };
}

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly messageTemplateService: MessageTemplateService,
    @InjectQueue('teams') private readonly teamsQueue: Queue,
  ) {}

  async querySubscription(
    handle: number,
    payload: object | object[],
    currentUser: PersonItem,
  ): Promise<TeamsDeliveryItem[]> {
    const subscription = await this.em.findOne(
      TeamsSubscriptionItem,
      { handle },
      { populate: ['entity', 'type', 'template'] },
    );

    if (!subscription?.isActive) {
      throw new Error('global.notActive');
    }

    const entityHandle =
      typeof subscription.entity === 'object'
        ? subscription.entity.handle
        : undefined;

    if (!entityHandle) {
      throw new Error('global.entityNotFound');
    }

    const template = subscription.template;
    if (
      !template ||
      typeof template !== 'object' ||
      template.isActive === false
    ) {
      throw new Error('global.notActive');
    }

    const sender = await this.resolveSender(currentUser.handle);
    const items = Array.isArray(payload) ? payload : [payload];
    const deliveries: TeamsDeliveryItem[] = [];

    for (const item of items) {
      const prepared = await this.prepareDelivery({
        subscription,
        item,
        currentUser,
        sender,
      });

      const delivery = new TeamsDeliveryItem();
      delivery.subscription = subscription;
      delivery.template = template;
      delivery.entity = subscription.entity;
      delivery.createdBy = prepared.createdBy;
      delivery.recipientPerson = prepared.recipientPerson;
      delivery.referenceHandle = prepared.referenceHandle;
      delivery.provider = 'azure';
      delivery.bodyMarkdown = prepared.bodyMarkdown;
      delivery.bodyHtml = prepared.bodyHtml;
      delivery.requestPayload = prepared.requestPayload;
      delivery.attemptCount = 0;

      if (prepared.failure) {
        delivery.status = await this.ensureStatus(this.em, 'failed');
        delivery.responseStatusCode = prepared.failure.statusCode ?? 400;
        delivery.responseBody = { message: prepared.failure.message };
        delivery.completedAt = new Date();
      } else {
        delivery.status = await this.ensureStatus(this.em, 'pending');
      }

      await this.em.persist(delivery).flush();

      if (!prepared.failure) {
        if (REDIS_ENABLED) {
          await this.teamsQueue.add('deliver-teams-message', {
            deliveryId: delivery.handle,
          });
        } else if (delivery.handle) {
          await this.dispatchDelivery(delivery.handle);
        }
      }

      deliveries.push(delivery);
    }

    return deliveries;
  }

  async dispatchDelivery(deliveryId: number): Promise<TeamsDeliveryItem> {
    const em = this.em.fork();
    const delivery = await em.findOne(
      TeamsDeliveryItem,
      { handle: deliveryId },
      {
        populate: [
          'status',
          'subscription',
          'template',
          'entity',
          'createdBy',
          'createdBy.type',
          'createdBy.session',
          'recipientPerson',
          'recipientPerson.type',
        ],
      },
    );

    if (!delivery) {
      throw new NotFoundException('teams.deliveryNotFound');
    }

    delivery.attemptCount = (delivery.attemptCount ?? 0) + 1;

    try {
      const accessToken = await this.resolveAzureAccessToken(
        em,
        delivery.createdBy.session,
      );
      if (!accessToken) {
        throw new BadRequestException('teams.sessionNotFound');
      }

      const senderLoginName = delivery.createdBy.loginName?.trim();
      const recipientLoginName = delivery.recipientPerson?.loginName?.trim();

      if (!senderLoginName || delivery.createdBy.type?.handle !== 'azure') {
        throw new BadRequestException('teams.senderAzureRequired');
      }

      if (
        !recipientLoginName ||
        delivery.recipientPerson?.type?.handle !== 'azure'
      ) {
        throw new BadRequestException('teams.recipientAzureRequired');
      }

      if (this.isSamePerson(delivery.createdBy, delivery.recipientPerson)) {
        throw new BadRequestException('teams.selfChatNotSupported');
      }

      const client = Client.init({
        authProvider: (done) => done(null, accessToken),
      });

      const chat = (await client.api('/chats').post({
        chatType: 'oneOnOne',
        members: [
          {
            '@odata.type': '#microsoft.graph.aadUserConversationMember',
            roles: ['owner'],
            'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${senderLoginName}')`,
          },
          {
            '@odata.type': '#microsoft.graph.aadUserConversationMember',
            roles: ['owner'],
            'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${recipientLoginName}')`,
          },
        ],
      })) as GraphChat;

      if (!chat.id) {
        throw new BadRequestException('teams.chatCreateFailed');
      }

      const message = (await client.api(`/chats/${chat.id}/messages`).post({
        body: {
          contentType: 'html',
          content: delivery.bodyHtml,
        },
      })) as GraphMessage;

      const success = await this.ensureStatus(em, 'success');
      delivery.status = success;
      delivery.responseStatusCode = 201;
      delivery.responseBody = {
        chatId: chat.id,
        messageId: message.id,
      };
      delivery.providerMessageId = message.id;
      delivery.completedAt = new Date();
      await em.flush();

      return delivery;
    } catch (error) {
      const failed = await this.ensureStatus(em, 'failed');
      const graphError = getGraphErrorShape(error);

      delivery.status = failed;
      delivery.responseStatusCode = graphError.statusCode ?? 500;
      delivery.responseBody = {
        message: graphError.message ?? 'Unknown error',
        providerError: toPersistedObject(graphError.body),
      };
      delivery.completedAt = new Date();
      await em.flush();
      throw error;
    }
  }

  async retryDelivery(handle: number): Promise<TeamsDeliveryItem> {
    const pending = await this.ensureStatus(this.em, 'pending');
    const delivery = await this.em.findOne(TeamsDeliveryItem, { handle });

    if (!delivery) {
      throw new NotFoundException('teams.deliveryNotFound');
    }

    delivery.status = pending;
    delivery.nextRetryAt = undefined;
    delivery.completedAt = undefined;
    delivery.responseStatusCode = undefined;
    delivery.responseBody = undefined;
    delivery.providerMessageId = undefined;

    await this.em.flush();

    if (REDIS_ENABLED) {
      await this.teamsQueue.add('deliver-teams-message', {
        deliveryId: delivery.handle,
      });
    } else if (delivery.handle) {
      await this.dispatchDelivery(delivery.handle);
    }

    return await this.em.findOneOrFail(TeamsDeliveryItem, {
      handle: delivery.handle,
    });
  }

  private async prepareDelivery(options: {
    subscription: TeamsSubscriptionItem;
    item: object;
    currentUser: PersonItem;
    sender: PersonItem | null;
  }): Promise<{
    createdBy: PersonItem;
    recipientPerson?: PersonItem;
    referenceHandle?: string;
    bodyMarkdown: string;
    bodyHtml: string;
    requestPayload: object;
    failure?: { message: string; statusCode?: number };
  }> {
    const entityHandle =
      typeof options.subscription.entity === 'object'
        ? options.subscription.entity.handle
        : '';
    const template =
      typeof options.subscription.template === 'object'
        ? options.subscription.template
        : null;
    const referenceHandle = this.extractReferenceHandle(options.item);
    const isDeleteSubscription =
      options.subscription.type?.handle === 'afterDelete';
    const createdBy = options.sender ?? options.currentUser;

    const baseContext =
      !isDeleteSubscription && referenceHandle
        ? await this.messageTemplateService.loadEntityContext(
            entityHandle,
            referenceHandle,
          )
        : (options.item as JsonRecord);

    const context = {
      currentUser: options.currentUser,
      ...baseContext,
    };
    const recipientValue = this.messageTemplateService.getContextValue(
      context,
      options.subscription.recipientField,
    );
    const recipientPerson = await this.resolveRecipient(recipientValue);
    const bodySource = template?.bodyMarkdown ?? '';
    const bodyMarkdown = this.messageTemplateService.replacePlaceholders(
      bodySource,
      context,
    );
    const bodyHtml = this.messageTemplateService.renderMarkdown(bodyMarkdown);

    if (!options.sender || options.sender.type?.handle !== 'azure') {
      return {
        createdBy,
        recipientPerson: recipientPerson ?? undefined,
        referenceHandle,
        bodyMarkdown,
        bodyHtml,
        requestPayload: {
          recipientField: options.subscription.recipientField,
          referenceHandle,
        },
        failure: { message: 'teams.senderAzureRequired', statusCode: 400 },
      };
    }

    if (!recipientPerson) {
      return {
        createdBy,
        referenceHandle,
        bodyMarkdown,
        bodyHtml,
        requestPayload: {
          recipientField: options.subscription.recipientField,
          referenceHandle,
        },
        failure: { message: 'teams.recipientNotFound', statusCode: 404 },
      };
    }

    if (
      recipientPerson.type?.handle !== 'azure' ||
      !recipientPerson.loginName?.trim()
    ) {
      return {
        createdBy,
        recipientPerson,
        referenceHandle,
        bodyMarkdown,
        bodyHtml,
        requestPayload: {
          recipientField: options.subscription.recipientField,
          referenceHandle,
          recipientPersonHandle: recipientPerson.handle,
        },
        failure: { message: 'teams.recipientAzureRequired', statusCode: 400 },
      };
    }

    if (this.isSamePerson(options.sender, recipientPerson)) {
      return {
        createdBy,
        recipientPerson,
        referenceHandle,
        bodyMarkdown,
        bodyHtml,
        requestPayload: {
          recipientField: options.subscription.recipientField,
          referenceHandle,
          senderPersonHandle: options.sender.handle,
          senderLoginName: options.sender.loginName,
          recipientPersonHandle: recipientPerson.handle,
          recipientLoginName: recipientPerson.loginName,
        },
        failure: { message: 'teams.selfChatNotSupported', statusCode: 400 },
      };
    }

    return {
      createdBy,
      recipientPerson,
      referenceHandle,
      bodyMarkdown,
      bodyHtml,
      requestPayload: {
        recipientField: options.subscription.recipientField,
        referenceHandle,
        senderPersonHandle: options.sender.handle,
        senderLoginName: options.sender.loginName,
        recipientPersonHandle: recipientPerson.handle,
        recipientLoginName: recipientPerson.loginName,
      },
    };
  }

  private extractReferenceHandle(item: object): string | undefined {
    if (!isRecord(item)) {
      return undefined;
    }

    const value = item.handle;
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value);
    }

    return undefined;
  }

  private async resolveSender(handle?: number): Promise<PersonItem | null> {
    if (!handle) {
      return null;
    }

    return await this.em.findOne(
      PersonItem,
      { handle },
      { populate: ['session', 'type'] },
    );
  }

  private async resolveRecipient(value: unknown): Promise<PersonItem | null> {
    const handle = this.extractPersonHandle(value);
    if (!handle) {
      return null;
    }

    return await this.em.findOne(
      PersonItem,
      { handle },
      { populate: ['type'] },
    );
  }

  private extractPersonHandle(value: unknown): number | null {
    if (typeof value === 'number' && Number.isInteger(value)) {
      return value;
    }

    if (typeof value === 'string' && /^\d+$/.test(value)) {
      return Number(value);
    }

    if (isRecord(value)) {
      return this.extractPersonHandle(value.handle);
    }

    return null;
  }

  private isSamePerson(
    left?: PersonItem | null,
    right?: PersonItem | null,
  ): boolean {
    if (!left || !right) {
      return false;
    }

    if (left.handle && right.handle) {
      return left.handle === right.handle;
    }

    const leftLoginName = left.loginName?.trim().toLowerCase();
    const rightLoginName = right.loginName?.trim().toLowerCase();

    return Boolean(
      leftLoginName && rightLoginName && leftLoginName === rightLoginName,
    );
  }

  private async ensureStatus(
    em: EntityManager,
    handle: string,
  ): Promise<TeamsDeliveryStatusItem> {
    const existing = await em.findOne(TeamsDeliveryStatusItem, { handle });
    if (existing) {
      return existing;
    }

    const created = new TeamsDeliveryStatusItem();
    created.handle = handle;

    switch (handle) {
      case 'success':
        created.description = 'Success';
        created.icon = 'mdi-microsoft-teams';
        created.color = '#4CAF50';
        break;
      case 'failed':
        created.description = 'Failed';
        created.icon = 'mdi-microsoft-teams';
        created.color = '#F44336';
        break;
      default:
        created.description = 'Pending';
        created.icon = 'mdi-microsoft-teams';
        created.color = '#FF9800';
        break;
    }

    await em.persist(created).flush();
    return created;
  }

  private async resolveAzureAccessToken(
    em: EntityManager,
    session?: PersonSessionItem,
  ): Promise<string | null> {
    const directToken = session?.accessToken?.trim();
    if (directToken) {
      return directToken;
    }

    const refreshToken = session?.refreshToken?.trim();
    if (!refreshToken) {
      return null;
    }

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

    const accessToken = response.data.access_token?.trim() ?? null;
    if (!accessToken || !session) {
      return accessToken;
    }

    session.accessToken = accessToken;
    await em.flush();
    this.logger.debug('Refreshed Azure access token for Teams delivery');
    return accessToken;
  }
}
