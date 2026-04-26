import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../entity/EmailDeliveryItem', () => ({
  EmailDeliveryItem: class {},
}));
jest.mock('../entity/EntityItem', () => ({ EntityItem: class {} }));
jest.mock('../entity/PersonItem', () => ({ PersonItem: class {} }));

import { EmailDeliveryController } from './EmailDeliveryController';

describe('EmailDeliveryController', () => {
  beforeEach(() => {
    global.log = {
      trace: jest.fn(),
      warn: jest.fn(),
    } as unknown as typeof global.log;
  });

  it('retries persisted email deliveries', async () => {
    const mailService = {
      retryDelivery: jest.fn().mockResolvedValue({ handle: 15 }),
    };
    const controller = new EmailDeliveryController(
      { handle: 'emailDelivery' } as never,
      { handle: 1 } as never,
      {} as never,
    );
    controller.mailService = mailService as never;

    const result = await controller.execute(
      [{ handle: 15 }, { handle: 16 }] as object[],
      'retryDelivery',
    );

    expect(mailService.retryDelivery).toHaveBeenNthCalledWith(1, 15);
    expect(mailService.retryDelivery).toHaveBeenNthCalledWith(2, 16);
    expect(result.isSuccess).toBe(true);
  });
});
