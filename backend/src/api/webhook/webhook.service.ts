// webhook.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EntityManager } from '@mikro-orm/core';
import { WebhookSubscriptionItem } from '../../entity/WebhookSubscriptionItem';
import { WebhookDeliveryItem } from '../../entity/WebhookDeliveryItem';
import { WebhookDeliveryStatusItem } from '../../entity/WebhookDeliveryStatusItem';

/**
 * @class
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Service for handling webhook delivery and retry logic.
 *
 * @property        em                   EntityManager for database access
 * @property        webhookQueue         BullMQ queue for webhook jobs
 * @method          querySubscription    Creates delivery entry and queues webhook job
 * @method          retryDelivery        Resets status and re-queues webhook job
 */
@Injectable()
export class WebhookService {
  /**
   * Initializes the WebhookService with EntityManager and webhook queue.
   * @param em EntityManager for database access
   * @param webhookQueue BullMQ queue for webhook jobs
   */
  constructor(
    private readonly em: EntityManager,
    @InjectQueue('webhooks') private readonly webhookQueue: Queue, // Queue injection
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
    const subscription = await this.em.findOne(WebhookSubscriptionItem, {
      handle: handle,
    });
    const pending = await this.em.findOne(WebhookDeliveryStatusItem, {
      handle: 'pending',
    });

    if (!subscription?.isActive) {
      throw new Error('global.notActive');
    }

    if (!pending) {
      throw new Error('global.notFound');
    }

    // 1. DB Eintrag erstellen (Status Pending)
    const delivery = new WebhookDeliveryItem();
    delivery.subscription = subscription;
    delivery.payload = payload;
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

    const delivery = await this.em.findOne(WebhookDeliveryItem, {
      handle: handle,
    });

    if (!delivery || !pending) {
      throw new Error('global.notFound');
    }

    delivery.status = pending;
    delivery.nextRetryAt = undefined; // BullMQ regelt das Timing jetzt, Feld evtl. obsolet

    await this.em.flush();

    // Job erneut zur Queue hinzufügen
    await this.webhookQueue.add('deliver-webhook', {
      deliveryId: delivery.handle,
    });

    return delivery;
  }
}
