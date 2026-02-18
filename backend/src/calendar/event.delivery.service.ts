import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/mysql';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventDeliveryItem } from '../entity/EventDeliveryItem';
import { EventDeliveryStatusItem } from '../entity/EventDeliveryStatusItem';
import { EventItem } from '../entity/EventItem';

@Injectable()
export class EventDeliveryService {
  constructor(
    private readonly em: EntityManager,
    @InjectQueue('calendar') private readonly calendarQueue: Queue,
  ) {}

  /**
   * Create a delivery entry and queue the event for processing
   */
  async queueEventDelivery(
    event: EventItem,
    payload: object,
  ): Promise<EventDeliveryItem> {
    const pending = await this.em.findOne(EventDeliveryStatusItem, {
      handle: 'pending',
    });
    if (!pending) throw new Error('event.pendingStatusNotFound');

    // 1. Create DB entry (status pending)
    const delivery = new EventDeliveryItem();
    delivery.event = event;
    delivery.payload = { ...event, ...payload };
    delivery.status = pending;
    delivery.attemptCount = 0;
    delivery.createdAt = new Date();
    delivery.updatedAt = new Date();

    await this.em.persist(delivery).flush();

    // 2. Add job to queue (pass only the delivery ID)
    await this.calendarQueue.add('deliver-calendar-event', {
      deliveryId: delivery.handle,
    });

    return delivery;
  }

  /**
   * Retry a failed delivery by resetting status and re-queueing
   */
  async retryDelivery(handle: number): Promise<EventDeliveryItem> {
    const pending = await this.em.findOne(EventDeliveryStatusItem, {
      handle: 'pending',
    });
    if (!pending) throw new Error('event.pendingStatusNotFound');

    const delivery = await this.em.findOne(EventDeliveryItem, { handle });
    if (!delivery) throw new Error('event.deliveryNotFound');

    delivery.status = pending;
    delivery.nextRetryAt = undefined;
    await this.em.flush();

    await this.calendarQueue.add('deliver-calendar-event', {
      deliveryId: delivery.handle,
    });

    return delivery;
  }
}
