import { EntityManager } from '@mikro-orm/core';
import { Injectable, NotFoundException } from '@nestjs/common';
import { MessageTemplateService } from '../template/message-template.service';
import { InboxNotificationItem } from '../../entity/InboxNotificationItem';
import { InboxSubscriptionItem } from '../../entity/InboxSubscriptionItem';
import { PersonItem } from '../../entity/PersonItem';
import { OpenTaskEventsService } from '../current/open-task-events.service';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

@Injectable()
export class InboxService {
  constructor(
    private readonly em: EntityManager,
    private readonly messageTemplateService: MessageTemplateService,
    private readonly openTaskEventsService: OpenTaskEventsService,
  ) {}

  async querySubscription(
    handle: number,
    payload: object | object[],
    currentUser: PersonItem,
    relationExpressions: string[] = [],
  ): Promise<InboxNotificationItem[]> {
    const subscription = await this.em.findOne(
      InboxSubscriptionItem,
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
    const template =
      subscription.template && typeof subscription.template === 'object'
        ? subscription.template
        : null;

    if (!entityHandle) {
      throw new Error('global.entityNotFound');
    }

    if (!template || template.isActive === false) {
      throw new Error('global.notActive');
    }

    const items = Array.isArray(payload) ? payload : [payload];
    const notifications: InboxNotificationItem[] = [];
    const affectedUserHandles = new Set<number>();

    for (const item of items) {
      const prepared = await this.prepareNotifications({
        subscription,
        item,
        currentUser,
        relationExpressions,
      });

      for (const recipient of prepared.recipients) {
        if (typeof recipient.handle === 'number') {
          affectedUserHandles.add(recipient.handle);
        }

        const notification = this.em.create(InboxNotificationItem, {
          subscription,
          template,
          entity: subscription.entity,
          createdBy: currentUser.handle,
          recipientPerson: recipient.handle,
          referenceHandle: prepared.referenceHandle,
          title: prepared.title,
          bodyMarkdown: prepared.bodyMarkdown,
          bodyText: prepared.bodyText,
          requestPayload: {
            recipientField: subscription.recipientField,
            referenceHandle: prepared.referenceHandle,
            recipientPersonHandle: recipient.handle,
          },
          isRead: false,
        } as never);

        notifications.push(notification);
      }
    }

    if (notifications.length > 0) {
      await this.em.flush();
      this.openTaskEventsService.notifyUsers(affectedUserHandles);
    }

    return notifications;
  }

  async getUnreadNotifications(
    user: Pick<PersonItem, 'handle'>,
  ): Promise<InboxNotificationItem[]> {
    if (user.handle == null) {
      return [];
    }

    return this.em.find(
      InboxNotificationItem,
      {
        recipientPerson: { handle: user.handle },
        isRead: false,
      },
      {
        populate: [
          'entity',
          'subscription',
          'template',
          'createdBy',
          'recipientPerson',
        ],
        orderBy: { createdAt: 'DESC', handle: 'DESC' },
      },
    );
  }

  async markNotificationRead(
    handle: number,
    user: Pick<PersonItem, 'handle'>,
  ): Promise<InboxNotificationItem> {
    const notification = await this.em.findOne(
      InboxNotificationItem,
      {
        handle,
        recipientPerson: { handle: user.handle },
      },
      {
        populate: [
          'entity',
          'subscription',
          'template',
          'createdBy',
          'recipientPerson',
        ],
      },
    );

    if (!notification) {
      throw new NotFoundException('global.entityNotFound');
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await this.em.flush();
    this.openTaskEventsService.notifyUsers([user.handle]);
    return notification;
  }

  private async prepareNotifications(options: {
    subscription: InboxSubscriptionItem;
    item: object;
    currentUser: PersonItem;
    relationExpressions: string[];
  }): Promise<{
    recipients: PersonItem[];
    referenceHandle?: string;
    title: string;
    bodyMarkdown: string;
    bodyText: string;
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

    const baseContext =
      !isDeleteSubscription && referenceHandle
        ? await this.messageTemplateService.loadEntityContext(
            entityHandle,
            referenceHandle,
            options.relationExpressions,
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
    const recipients = await this.resolveRecipients(recipientValue);
    const title = this.messageTemplateService.replacePlaceholders(
      template?.titleTemplate ?? template?.name ?? '',
      context,
    );
    const bodyMarkdown = this.messageTemplateService.replacePlaceholders(
      template?.bodyMarkdown ?? '',
      context,
    );

    return {
      recipients,
      referenceHandle,
      title,
      bodyMarkdown,
      bodyText: this.messageTemplateService.stripMarkdown(bodyMarkdown),
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

  private async resolveRecipients(value: unknown): Promise<PersonItem[]> {
    const handles = [...new Set(this.extractPersonHandles(value))];
    if (handles.length === 0) {
      return [];
    }

    return this.em.find(PersonItem, { handle: { $in: handles } });
  }

  private extractPersonHandles(value: unknown): number[] {
    if (Array.isArray(value)) {
      return value.flatMap((entry) => this.extractPersonHandles(entry));
    }

    if (typeof value === 'number' && Number.isInteger(value)) {
      return [value];
    }

    if (typeof value === 'string' && /^\d+$/.test(value)) {
      return [Number(value)];
    }

    if (isRecord(value)) {
      return this.extractPersonHandles(value.handle);
    }

    return [];
  }
}
