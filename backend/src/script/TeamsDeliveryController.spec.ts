import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../entity/EntityItem', () => ({ EntityItem: class {} }));
jest.mock('../entity/PersonItem', () => ({ PersonItem: class {} }));
jest.mock('../entity/TeamsDeliveryItem', () => ({
  TeamsDeliveryItem: class {},
}));

import { TeamsDeliveryController } from './TeamsDeliveryController';

describe('TeamsDeliveryController', () => {
  beforeEach(() => {
    global.log = {
      trace: jest.fn(),
      warn: jest.fn(),
    } as unknown as typeof global.log;
  });

  it('retries persisted teams deliveries', async () => {
    const teamsService = {
      retryDelivery: jest.fn().mockResolvedValue({ handle: 42 }),
    };
    const controller = new TeamsDeliveryController(
      { handle: 'teamsDelivery' } as never,
      { handle: 1 } as never,
      {} as never,
    );
    controller.teamsService = teamsService as never;

    const result = await controller.execute(
      [{ handle: 42 }] as object[],
      'retryDelivery',
    );

    expect(teamsService.retryDelivery).toHaveBeenCalledWith(42);
    expect(result.isSuccess).toBe(true);
  });

  it('injects teamsService via constructor', async () => {
    const teamsService = {
      retryDelivery: jest.fn().mockResolvedValue({ handle: 43 }),
    };
    const controller = new TeamsDeliveryController(
      { handle: 'teamsDelivery' } as never,
      { handle: 1 } as never,
      {} as never,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      teamsService as never,
    );

    const result = await controller.execute(
      [{ handle: 43 }] as object[],
      'retryDelivery',
    );

    expect(teamsService.retryDelivery).toHaveBeenCalledWith(43);
    expect(result.isSuccess).toBe(true);
  });
});
