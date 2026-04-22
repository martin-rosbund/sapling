import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@mikro-orm/core', () => ({
  EntityManager: class {},
}));
jest.mock('../../entity/PersonItem', () => ({ PersonItem: class {} }));
jest.mock('../../entity/TicketItem', () => ({ TicketItem: class {} }));
jest.mock('../../entity/EventItem', () => ({ EventItem: class {} }));
jest.mock('../../entity/global/entity.registry', () => ({
  ENTITY_HANDLES: [],
}));
jest.mock('../../entity/WorkHourWeekItem', () => ({
  WorkHourWeekItem: class {},
}));

import { CurrentService } from './current.service';

describe('CurrentService', () => {
  it('counts open tasks via database count queries instead of loading full lists', async () => {
    const count = jest
      .fn<(entity: unknown, where: Record<string, unknown>) => Promise<number>>()
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(5);
    const find = jest.fn();
    const em = {
      count,
      find,
    };
    const service = new CurrentService(em as never);

    const result = await service.countOpenTasks({ handle: 7 } as unknown as never);

    expect(result).toEqual({ count: 8 });
    expect(count).toHaveBeenCalledTimes(2);
    expect(find).not.toHaveBeenCalled();
    expect(count.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        participants: { handle: 7 },
        status: { handle: { $nin: ['canceled', 'completed'] } },
      }),
    );
    expect(count.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        assigneePerson: { handle: 7 },
        status: { handle: { $nin: ['closed'] } },
      }),
    );
  });
});
