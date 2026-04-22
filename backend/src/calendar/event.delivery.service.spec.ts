import { describe, expect, it, jest } from '@jest/globals';
import { EventDeliveryService } from './event.delivery.service';
import type { EventItem } from '../entity/EventItem';
import type { EventDeliveryStatusItem } from '../entity/EventDeliveryStatusItem';

const asMock = (value: unknown): jest.Mock => value as jest.Mock;

describe('EventDeliveryService', () => {
  it('stores only the explicit calendar payload and queues the created delivery', async () => {
    const pending = { handle: 'pending' } as EventDeliveryStatusItem;
    const queue = {
      add: jest.fn(() => undefined),
    };
    const em = {
      findOne: jest.fn(() => pending),
      persist: jest.fn((entity: { handle?: number }) => ({
        flush: jest.fn(() => {
          entity.handle = 15;
        }),
      })),
    };
    const service = new EventDeliveryService(em as never, queue as never);
    const event = { handle: 42 } as EventItem;

    const delivery = await service.queueEventDelivery(event, {
      provider: 'azure',
      sessionHandle: 7,
    });

    expect(delivery.event).toBe(event);
    expect(delivery.payload).toEqual({
      provider: 'azure',
      sessionHandle: 7,
    });
    expect(delivery.payload).not.toHaveProperty('handle');
    expect(asMock(queue.add)).toHaveBeenCalledWith('deliver-calendar-event', {
      deliveryId: 15,
    });
  });
});
