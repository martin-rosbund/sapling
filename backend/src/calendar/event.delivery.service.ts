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
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventDeliveryItem } from '../entity/EventDeliveryItem';
import { EventDeliveryStatusItem } from '../entity/EventDeliveryStatusItem';
import { EventItem } from '../entity/EventItem';
import { REDIS_ENABLED } from '../constants/project.constants';
import { CalendarDeliveryExecutor } from './calendar-delivery.executor';

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
    @Inject(forwardRef(() => CalendarDeliveryExecutor))
    private readonly calendarDeliveryExecutor: CalendarDeliveryExecutor,
  ) {}

  /**
   * Creates a delivery entry and queues the event for processing.
   * @param {EventItem} event Event to be delivered
   * @param {object} payload Additional payload for delivery
   * @returns {Promise<EventDeliveryItem>} The created delivery item
   */
  async queueEventDelivery(
    event: EventItem,
    payload: Record<string, unknown>,
  ): Promise<EventDeliveryItem | null> {
    // Events whose type is excluded from the default calendar (e.g. internal
    // mail/phone-call follow-ups) must not be propagated to external
    // calendars such as Outlook or Google.
    const eventType =
      event.type ??
      (event.handle != null
        ? (
            await this.em.findOne(
              EventItem,
              { handle: event.handle },
              { populate: ['type'] },
            )
          )?.type
        : undefined);

    if (eventType && eventType.showInDefaultCalendar === false) {
      return null;
    }

    const pending = await this.em.findOne(EventDeliveryStatusItem, {
      handle: 'pending',
    });
    if (!pending) throw new Error('event.pendingStatusNotFound');

    // 1. Create DB entry (status pending)
    const delivery = new EventDeliveryItem();
    delivery.event = event;
    delivery.payload = payload;
    delivery.status = pending;
    delivery.attemptCount = 0;
    delivery.createdAt = new Date();
    delivery.updatedAt = new Date();

    await this.em.persist(delivery).flush();

    if (REDIS_ENABLED) {
      await this.calendarQueue.add('deliver-calendar-event', {
        deliveryId: delivery.handle,
      });
      return delivery;
    }

    if (typeof delivery.handle === 'number') {
      await this.calendarDeliveryExecutor.execute(delivery.handle, 1);
      return await this.em.findOneOrFail(EventDeliveryItem, {
        handle: delivery.handle,
      });
    }

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

    if (REDIS_ENABLED) {
      await this.calendarQueue.add('deliver-calendar-event', {
        deliveryId: delivery.handle,
      });
    } else if (typeof delivery.handle === 'number') {
      await this.calendarDeliveryExecutor.execute(delivery.handle, 1);
    }

    return delivery;
  }
}
