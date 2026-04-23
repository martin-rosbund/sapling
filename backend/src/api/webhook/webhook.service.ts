// webhook.service.ts
import { EntityManager } from '@mikro-orm/core';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { TemplateService } from '../template/template.service';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { WebhookSubscriptionItem } from '../../entity/WebhookSubscriptionItem';
import { WebhookDeliveryItem } from '../../entity/WebhookDeliveryItem';
import { WebhookDeliveryStatusItem } from '../../entity/WebhookDeliveryStatusItem';
import { hasSaplingOption } from '../../entity/global/entity.decorator';
import { ENTITY_MAP } from '../../entity/global/entity.registry';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Service for handling webhook delivery and retry logic.
 *
 * @property        em                   EntityManager for database access
 * @property        templateService      Service for entity templates
 * @property        webhookQueue         BullMQ queue for webhook jobs
 * @method          querySubscription    Creates delivery entry and queues webhook job
 * @method          retryDelivery        Resets status and re-queues webhook job
 */
@Injectable()
export class WebhookService {
  /**
   * Initializes the WebhookService with EntityManager and webhook queue.
   * @param em EntityManager for database access
   * @param templateService Service for entity templates
   * @param webhookQueue BullMQ queue for webhook jobs
   */
  constructor(
    private readonly em: EntityManager,
    private readonly templateService: TemplateService,
    @InjectQueue('webhooks') private readonly webhookQueue: Queue,
  ) {}

  /**
   * Creates the delivery entry and adds it to the queue.
   * @param handle Subscription handle
   * @param payload Payload object for webhook
   * @returns WebhookDeliveryItem entity
   */
  async querySubscription(
    handle: number,
    payload: object,
  ): Promise<WebhookDeliveryItem> {
    const subscription = await this.em.findOne(
      WebhookSubscriptionItem,
      { handle },
      { populate: ['entity'] },
    );
    const pending = await this.em.findOne(WebhookDeliveryStatusItem, {
      handle: 'pending',
    });

    if (!subscription?.isActive) {
      throw new Error('global.notActive');
    }

    if (!pending) {
      throw new Error('global.notFound');
    }

    const preparedPayload = await this.preparePayload(subscription, payload);

    // 1. DB Eintrag erstellen (Status Pending)
    const delivery = new WebhookDeliveryItem();
    delivery.subscription = subscription;
    delivery.payload = preparedPayload;
    delivery.status = pending;

    await this.em.persist(delivery).flush();

    // 2. Job in die Queue werfen (wir übergeben nur die ID)
    await this.webhookQueue.add('deliver-webhook', {
      deliveryId: delivery.handle,
    });

    return delivery;
  }

  /**
   * Resets status and re-queues the webhook job.
   * @param handle Delivery handle
   * @returns WebhookDeliveryItem entity
   */
  async retryDelivery(handle: number): Promise<WebhookDeliveryItem> {
    const pending = await this.em.findOne(WebhookDeliveryStatusItem, {
      handle: 'pending',
    });

    const delivery = await this.em.findOne(WebhookDeliveryItem, { handle });

    if (!delivery || !pending) {
      throw new Error('global.notFound');
    }

    delivery.status = pending;
    delivery.nextRetryAt = undefined;

    await this.em.flush();

    // Job erneut zur Queue hinzufügen
    await this.webhookQueue.add('deliver-webhook', {
      deliveryId: delivery.handle,
    });

    return delivery;
  }

  private async preparePayload(
    subscription: WebhookSubscriptionItem,
    payload: object,
  ): Promise<object> {
    const entityHandle =
      typeof subscription.entity === 'object' ? subscription.entity.handle : null;

    if (!entityHandle) {
      return payload;
    }

    const template = this.templateService.getEntityTemplate(entityHandle);
    const normalizedRelations = this.normalizeRelations(subscription.relations);

    if (normalizedRelations.length === 0) {
      return this.sanitizeEntityResult(entityHandle, payload, template);
    }

    const populate = this.buildPopulate(normalizedRelations, template);

    if (populate.length === 0) {
      return this.sanitizeEntityResult(entityHandle, payload, template);
    }

    const isDeleteSubscription = subscription.type?.handle === 'afterDelete';

    if (Array.isArray(payload)) {
      const preparedItems = await Promise.all(
        payload.map((item) =>
          this.preparePayloadItem(
            entityHandle,
            item,
            populate,
            isDeleteSubscription,
          ),
        ),
      );

      return this.sanitizeEntityResult(entityHandle, preparedItems, template);
    }

    const preparedItem = await this.preparePayloadItem(
      entityHandle,
      payload,
      populate,
      isDeleteSubscription,
    );

    return this.sanitizeEntityResult(
      entityHandle,
      preparedItem as object,
      template,
    );
  }

  private async preparePayloadItem(
    entityHandle: string,
    item: unknown,
    populate: string[],
    isDeleteSubscription: boolean,
  ): Promise<unknown> {
    if (!this.isPlainRecord(item)) {
      return item;
    }

    const isEntityInstance = item.constructor !== Object;

    if (isEntityInstance) {
      try {
        await this.em.populate(item as object, populate as never[]);
      } catch (error) {
        global.log.warn(
          `webhookService - populate failed for ${entityHandle}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      return item;
    }

    if (isDeleteSubscription) {
      return item;
    }

    const handle = this.extractHandleValue(item);

    if (
      handle == null ||
      (typeof handle !== 'string' && typeof handle !== 'number')
    ) {
      return item;
    }

    try {
      const entityClass = ENTITY_MAP[entityHandle];

      if (!entityClass) {
        return item;
      }

      const reloadedItem = await this.em.findOne(
        entityClass as never,
        this.getHandleFilter(entityHandle, handle),
        { populate: populate as never[] },
      );

      return reloadedItem ?? item;
    } catch (error) {
      global.log.warn(
        `webhookService - reload failed for ${entityHandle}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return item;
    }
  }

  private normalizeRelations(relations?: string[] | null): string[] {
    if (!Array.isArray(relations)) {
      return [];
    }

    return relations
      .filter((relation): relation is string => typeof relation === 'string')
      .map((relation) => relation.trim())
      .filter(Boolean);
  }

  private getHandleFilter(
    entityHandle: string,
    handle: string | number,
  ): { handle: string | number } {
    return { handle: this.normalizeHandleValue(entityHandle, handle) };
  }

  private normalizeHandleValue(
    entityHandle: string,
    handle: string | number,
  ): string | number {
    const handleField = this.templateService
      .getEntityTemplate(entityHandle)
      .find((field) => field.name === 'handle');

    if (
      handleField?.type === 'number' &&
      typeof handle === 'string' &&
      handle.trim().length > 0
    ) {
      const parsedHandle = Number(handle);

      if (!Number.isNaN(parsedHandle)) {
        return parsedHandle;
      }
    }

    return handle;
  }

  private buildPopulate(
    relations: string[],
    template: EntityTemplateDto[],
  ): string[] {
    const populate: string[] = [];

    if (relations.includes('*')) {
      const refs: string[] = template
        .filter((x) => !!x.isReference)
        .map((x) => x.name);
      populate.push(...refs);
    } else {
      if (relations.includes('1:m')) {
        const refs: string[] = template
          .filter((x) => !!x.isReference && x.kind === '1:m')
          .map((x) => x.name);
        populate.push(...refs);
      }
      if (relations.includes('m:1')) {
        const refs: string[] = template
          .filter((x) => !!x.isReference && x.kind === 'm:1')
          .map((x) => x.name);
        populate.push(...refs);
      }
      if (relations.includes('m:n')) {
        const refs: string[] = template
          .filter((x) => !!x.isReference && x.kind === 'm:n')
          .map((x) => x.name);
        populate.push(...refs);
      }
      if (relations.includes('n:m')) {
        const refs: string[] = template
          .filter((x) => !!x.isReference && x.kind === 'n:m')
          .map((x) => x.name);
        populate.push(...refs);
      }
      const namedRefs: string[] = relations.filter((relation) => {
        return template.some((field) => {
          return (
            !!field.isReference &&
            (relation === field.name || relation.startsWith(`${field.name}.`))
          );
        });
      });
      populate.push(...namedRefs);
    }

    return [...new Set(populate)];
  }

  private sanitizeEntityResult<T>(
    entityHandle: string,
    value: T,
    template: EntityTemplateDto[] = this.templateService.getEntityTemplate(
      entityHandle,
    ),
    visited = new WeakMap<object, unknown>(),
    active = new WeakSet<object>(),
  ): T {
    if (Array.isArray(value)) {
      if (visited.has(value)) {
        if (active.has(value)) {
          return [] as T;
        }

        return visited.get(value) as T;
      }

      const sanitizedArray: unknown[] = [];
      visited.set(value, sanitizedArray);

      active.add(value);
      try {
        value.forEach((item) => {
          sanitizedArray.push(
            this.sanitizeEntityResult(
              entityHandle,
              item,
              template,
              visited,
              active,
            ),
          );
        });
      } finally {
        active.delete(value);
      }

      return sanitizedArray as T;
    }

    if (this.isCollectionLike(value)) {
      if (!this.isInitializedCollectionLike(value)) {
        return [] as T;
      }

      return this.sanitizeEntityResult(
        entityHandle,
        value.toArray(),
        template,
        visited,
        active,
      ) as T;
    }

    if (typeof value !== 'object' || value === null) {
      return value;
    }

    const cachedValue = visited.get(value);

    if (typeof cachedValue !== 'undefined') {
      if (active.has(value)) {
        return this.createCircularReferenceFallback(value) as T;
      }

      return cachedValue as T;
    }

    const record = value as Record<string, unknown>;
    const sanitizedRecord: Record<string, unknown> = {};
    visited.set(value, sanitizedRecord);
    active.add(value);

    const entityClass = ENTITY_MAP[entityHandle] as { prototype?: object };
    const securityFields = template
      .map((field) => field.name)
      .filter(
        (fieldName) =>
          entityClass &&
          typeof entityClass.prototype === 'object' &&
          hasSaplingOption(entityClass.prototype, fieldName, 'isSecurity'),
      );

    const recordKeys = Object.keys(record);
    const templateKeys = template
      .map((field) => field.name)
      .filter(
        (fieldName) => fieldName in record && !recordKeys.includes(fieldName),
      );
    const keys = [...new Set([...recordKeys, ...templateKeys])];

    try {
      for (const key of keys) {
        if (securityFields.includes(key)) {
          continue;
        }

        const field = template.find((entry) => entry.name === key);
        const fieldValue = record[key];

        if (field?.isReference && field.referenceName) {
          sanitizedRecord[key] = this.sanitizeEntityResult(
            field.referenceName,
            fieldValue,
            this.templateService.getEntityTemplate(field.referenceName),
            visited,
            active,
          );
          continue;
        }

        sanitizedRecord[key] = fieldValue;
      }
    } finally {
      active.delete(value);
    }

    return sanitizedRecord as T;
  }

  private createCircularReferenceFallback(
    value: object,
  ): Record<string, string | number> | null {
    const handle = this.extractHandleValue(value);

    if (typeof handle === 'string' || typeof handle === 'number') {
      return { handle };
    }

    return null;
  }

  private isCollectionLike(value: unknown): value is {
    toArray: () => unknown[];
    isInitialized?: () => boolean;
  } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'toArray' in value &&
      typeof (value as { toArray?: unknown }).toArray === 'function'
    );
  }

  private isInitializedCollectionLike(value: {
    isInitialized?: () => boolean;
  }): boolean {
    return typeof value.isInitialized !== 'function' || value.isInitialized();
  }

  private extractHandleValue(
    value: unknown,
  ): string | number | null | undefined {
    if (
      value == null ||
      typeof value === 'string' ||
      typeof value === 'number'
    ) {
      return value;
    }

    if (typeof value !== 'object') {
      return undefined;
    }

    const objectValue = value as Record<string, unknown>;

    if (
      'unwrap' in value &&
      typeof (value as { unwrap?: unknown }).unwrap === 'function'
    ) {
      return this.extractHandleValue(
        (value as { unwrap: () => unknown }).unwrap(),
      );
    }

    if (
      'getEntity' in value &&
      typeof (value as { getEntity?: unknown }).getEntity === 'function'
    ) {
      return this.extractHandleValue(
        (value as { getEntity: () => unknown }).getEntity(),
      );
    }

    if ('handle' in objectValue) {
      const nestedHandle = objectValue.handle;

      if (
        nestedHandle == null ||
        typeof nestedHandle === 'string' ||
        typeof nestedHandle === 'number'
      ) {
        return nestedHandle;
      }
    }

    return undefined;
  }

  private isPlainRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
