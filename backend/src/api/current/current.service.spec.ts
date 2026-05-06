import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@mikro-orm/core', () => ({
  EntityManager: class {},
}));
jest.mock('../../entity/PersonItem', () => ({ PersonItem: class {} }));
jest.mock('../../entity/TicketItem', () => ({ TicketItem: class {} }));
jest.mock('../../entity/EventItem', () => ({ EventItem: class {} }));
jest.mock('../../entity/SalesOpportunityItem', () => ({
  SalesOpportunityItem: class {},
}));
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
      .fn()
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2);
    const find = jest.fn();
    const em = {
      count,
      find,
    };
    const service = new CurrentService(em);

    const result = await service.countOpenTasks({
      handle: 7,
    });

    expect(result).toEqual({ count: 10 });
    expect(count).toHaveBeenCalledTimes(3);
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
    expect(count.mock.calls[2]?.[1]).toEqual(
      expect.objectContaining({
        assigneePerson: { handle: 7 },
        isActive: true,
      }),
    );
  });
});
