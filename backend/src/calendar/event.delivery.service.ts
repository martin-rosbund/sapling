/**
 * @class EventDeliveryService
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Service for managing event deliveries and queueing calendar events.
 *
 * @property        {EntityManager} em           Entity manager for database operations
 * @property        {Queue} calendarQueue        BullMQ queue for calendar event processing
 *
 * @method          queueEventDelivery           Creates a delivery entry and queues the event for processing
 * @method          retryDelivery                Retries a failed delivery by resetting status and re-queueing
 */
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/mysql';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventDeliveryItem } from '../entity/EventDeliveryItem';
import { EventDeliveryStatusItem } from '../entity/EventDeliveryStatusItem';
import { EventItem } from '../entity/EventItem';

@Injectable()
export class EventDeliveryService {
  /**
   * Creates a new EventDeliveryService.
   * @param {EntityManager} em Entity manager for database operations
   * @param {Queue} calendarQueue BullMQ queue for calendar event processing
   */
  constructor(
    private readonly em: EntityManager,
    @InjectQueue('calendar') private readonly calendarQueue: Queue,
  ) {}

  /**
   * Creates a delivery entry and queues the event for processing.
   * @param {EventItem} event Event to be delivered
   * @param {object} payload Additional payload for delivery
   * @returns {Promise<EventDeliveryItem>} The created delivery item
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
   * Retries a failed delivery by resetting status and re-queueing.
   * @param {number} handle Delivery handle to retry
   * @returns {Promise<EventDeliveryItem>} The retried delivery item
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
