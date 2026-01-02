// webhook.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EntityManager } from '@mikro-orm/mysql';
import { WebhookSubscriptionItem } from '../../entity/WebhookSubscriptionItem';
import { WebhookDeliveryItem } from '../../entity/WebhookDeliveryItem';
import { WebhookDeliveryStatusItem } from '../../entity/WebhookDeliveryStatusItem';

@Injectable()
export class WebhookService {
  constructor(
    private readonly em: EntityManager,
    @InjectQueue('webhooks') private readonly webhookQueue: Queue, // Queue injizieren
  ) {}

  /**
   * Erstellt den Delivery-Eintrag und wirft ihn in die Queue
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
   * Setzt Status zurück und wirft Job erneut in die Queue
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
