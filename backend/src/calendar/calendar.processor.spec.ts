import { describe, expect, it, jest } from '@jest/globals';
import { CalendarProcessor } from './calendar.processor';
import { EventDeliveryItem } from '../entity/EventDeliveryItem';
import { EventDeliveryStatusItem } from '../entity/EventDeliveryStatusItem';
import { PersonSessionItem } from '../entity/PersonSessionItem';

describe('CalendarProcessor', () => {
  it('resolves the session by handle and forwards only stable identifiers to Azure', async () => {
    const delivery = {
      handle: 21,
      event: { handle: 4 },
      payload: { provider: 'azure', sessionHandle: 8 },
      attemptCount: 0,
    } as EventDeliveryItem;
    const success = { handle: 'success' } as EventDeliveryStatusItem;
    const session = {
      handle: 8,
      accessToken: 'azure-token',
    } as PersonSessionItem;
    const emFork = {
      findOne: jest.fn(async (entity: unknown, where: { handle?: unknown }) => {
        if (entity === EventDeliveryItem) {
          return delivery;
        }
        if (entity === PersonSessionItem) {
          return session;
        }
        if (entity === EventDeliveryStatusItem && where.handle === 'success') {
          return success;
        }
        return null;
      }),
      flush: jest.fn(async () => undefined),
    };
    const em = {
      fork: jest.fn(() => emFork),
    };
    const azureCalendarService = {
      setEvent: jest.fn(async () => ({ id: 'az-1' })),
    };
    const googleCalendarService = {
      setEvent: jest.fn(async () => ({ id: 'g-1' })),
    };
    const processor = new CalendarProcessor(
      em as never,
      googleCalendarService as never,
      azureCalendarService as never,
    );

    await processor.process({
      data: { deliveryId: 21 },
      attemptsMade: 0,
    } as never);

    expect(azureCalendarService.setEvent).toHaveBeenCalledWith(
      4,
      'azure-token',
    );
    expect(googleCalendarService.setEvent).not.toHaveBeenCalled();
    expect(delivery.status).toBe(success);
    expect(delivery.responseStatusCode).toBe(200);
    expect(delivery.responseBody).toEqual({ id: 'az-1' });
    expect(emFork.flush).toHaveBeenCalled();
  });

  it('keeps legacy queued payloads with embedded session tokens working', async () => {
    const delivery = {
      handle: 22,
      event: { handle: 5 },
      payload: {
        provider: 'google',
        session: { accessToken: 'legacy-token' },
      },
      attemptCount: 0,
    } as EventDeliveryItem;
    const success = { handle: 'success' } as EventDeliveryStatusItem;
    const emFork = {
      findOne: jest.fn(async (entity: unknown, where: { handle?: unknown }) => {
        if (entity === EventDeliveryItem) {
          return delivery;
        }
        if (entity === EventDeliveryStatusItem && where.handle === 'success') {
          return success;
        }
        return null;
      }),
      flush: jest.fn(async () => undefined),
    };
    const em = {
      fork: jest.fn(() => emFork),
    };
    const azureCalendarService = {
      setEvent: jest.fn(async () => ({ id: 'az-1' })),
    };
    const googleCalendarService = {
      setEvent: jest.fn(async () => ({ status: 202, data: { ok: true } })),
    };
    const processor = new CalendarProcessor(
      em as never,
      googleCalendarService as never,
      azureCalendarService as never,
    );

    await processor.process({
      data: { deliveryId: 22 },
      attemptsMade: 0,
    } as never);

    expect(googleCalendarService.setEvent).toHaveBeenCalledWith(
      5,
      'legacy-token',
    );
    expect(azureCalendarService.setEvent).not.toHaveBeenCalled();
    expect(delivery.status).toBe(success);
    expect(delivery.responseStatusCode).toBe(202);
    expect(delivery.responseBody).toEqual({ ok: true });
  });
});
