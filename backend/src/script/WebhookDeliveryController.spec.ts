import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../entity/EntityItem', () => ({ EntityItem: class {} }));
jest.mock('../entity/PersonItem', () => ({ PersonItem: class {} }));
jest.mock('../entity/WebhookDeliveryItem', () => ({
  WebhookDeliveryItem: class {},
}));

import { WebhookDeliveryController } from './WebhookDeliveryController';

describe('WebhookDeliveryController', () => {
  beforeEach(() => {
    global.log = {
      trace: jest.fn(),
      warn: jest.fn(),
    } as unknown as typeof global.log;
  });

  it('retries persisted webhook deliveries', async () => {
    const webhookService = {
      retryDelivery: jest.fn().mockResolvedValue({ handle: 42 }),
    };
    const controller = new WebhookDeliveryController(
      { handle: 'webhookDelivery' } as never,
      { handle: 1 } as never,
      {} as never,
    );
    controller.webhookService = webhookService as never;

    const result = await controller.execute(
      [{ handle: 42 }] as object[],
      'retryDelivery',
    );

    expect(webhookService.retryDelivery).toHaveBeenCalledWith(42);
    expect(result.isSuccess).toBe(true);
  });

  it('injects webhookService via constructor', async () => {
    const webhookService = {
      retryDelivery: jest.fn().mockResolvedValue({ handle: 43 }),
    };
    const controller = new WebhookDeliveryController(
      { handle: 'webhookDelivery' } as never,
      { handle: 1 } as never,
      {} as never,
      undefined,
      undefined,
      undefined,
      webhookService as never,
    );

    const result = await controller.execute(
      [{ handle: 43 }] as object[],
      'retryDelivery',
    );

    expect(webhookService.retryDelivery).toHaveBeenCalledWith(43);
    expect(result.isSuccess).toBe(true);
  });
});
