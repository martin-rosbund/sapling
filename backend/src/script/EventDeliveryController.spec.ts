import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../entity/EntityItem', () => ({ EntityItem: class {} }));
jest.mock('../entity/EventDeliveryItem', () => ({
  EventDeliveryItem: class {},
}));
jest.mock('../entity/PersonItem', () => ({ PersonItem: class {} }));

import { EventDeliveryController } from './EventDeliveryController';

describe('EventDeliveryController', () => {
  beforeEach(() => {
    global.log = {
      trace: jest.fn(),
      warn: jest.fn(),
    } as unknown as typeof global.log;
  });

  it('retries persisted event deliveries', async () => {
    const eventDeliveryService = {
      retryDelivery: jest.fn().mockResolvedValue({ handle: 21 }),
    };
    const controller = new EventDeliveryController(
      { handle: 'eventDelivery' } as never,
      { handle: 1 } as never,
      {} as never,
    );
    controller.eventDeliveryService = eventDeliveryService as never;

    const result = await controller.execute(
      [{ handle: 21 }] as object[],
      'retryDelivery',
    );

    expect(eventDeliveryService.retryDelivery).toHaveBeenCalledWith(21);
    expect(result.isSuccess).toBe(true);
  });
});
