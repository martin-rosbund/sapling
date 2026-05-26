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
jest.mock('../../entity/DashboardItem', () => ({
  DashboardItem: class {
    name?: string;
    person?: unknown;
    kpis = {
      items: [] as unknown[],
      add: (...items: unknown[]) => {
        this.kpis.items.push(...items);
      },
    };
  },
}));
jest.mock('../../entity/DashboardTemplateItem', () => ({
  DashboardTemplateItem: class {},
}));
jest.mock('../../entity/FavoriteItem', () => ({
  FavoriteItem: class {
    title?: string;
    person?: unknown;
    entity?: unknown;
    entityRoute?: unknown;
    filter?: unknown;
  },
}));
jest.mock('../../entity/FavoriteTemplateItem', () => ({
  FavoriteTemplateItem: class {},
}));
jest.mock('../../entity/global/entity.registry', () => ({
  ENTITY_HANDLES: [],
}));
jest.mock('../../entity/WorkHourWeekItem', () => ({
  WorkHourWeekItem: class {},
}));

import { CurrentService } from './current.service';

describe('CurrentService', () => {
  it('provisions starter dashboards and favorites from role templates when none exist', async () => {
    const flush = jest.fn();
    const persist = jest.fn();
    const count = jest
      .fn<(...args: unknown[]) => Promise<number>>()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    const hydratedPerson = {
      handle: 7,
      roles: [
        {
          starterDashboardTemplates: [
            {
              handle: 11,
              name: 'Support Cockpit',
              kpis: [{ handle: 101 }, { handle: 102 }],
            },
          ],
          starterFavoriteTemplates: [
            {
              handle: 21,
              name: 'Offene Tickets',
              entity: { handle: 'ticket' },
              entityRoute: { handle: 5, route: 'table/ticket' },
              filter: { status: { handle: 'open' } },
            },
          ],
        },
      ],
    };
    const findOne = jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValueOnce(hydratedPerson)
      .mockResolvedValueOnce({
        handle: 7,
        roles: [],
        loginPassword: 'secret',
      });
    const fork = jest.fn(() => ({
      findOne,
      count,
      persist,
      flush,
    }));
    const em = {
      fork,
    };
    const service = new CurrentService(em as never, {} as never);

    const result = await service.getPerson({ handle: 7 });

    expect(count).toHaveBeenCalledWith(expect.anything(), {
      person: { handle: 7 },
    });
    expect(persist).toHaveBeenCalledTimes(2);
    const persistedDashboard = persist.mock.calls[0]?.[0] as
      | {
          kpis: {
            items: Array<{ handle: number }>;
          };
        }
      | undefined;
    expect(persist.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        name: 'Support Cockpit',
        person: hydratedPerson,
      }),
    );
    expect(persistedDashboard?.kpis.items).toEqual([
      { handle: 101 },
      { handle: 102 },
    ]);
    expect(persist.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        title: 'Offene Tickets',
        person: hydratedPerson,
        entity: { handle: 'ticket' },
        entityRoute: { handle: 5, route: 'table/ticket' },
        filter: { status: { handle: 'open' } },
      }),
    );
    expect(flush).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ handle: 7, roles: [] });
  });

  it('builds an open-task snapshot from the assigned records and unread notifications', async () => {
    const ticket = { handle: 1 };
    const event = { handle: 2 };
    const salesOpportunity = { handle: 3 };
    const effortEstimate = { handle: 4 };
    const notification = { handle: 5 };
    const find = jest
      .fn<(...args: unknown[]) => Promise<unknown[]>>()
      .mockResolvedValueOnce([ticket])
      .mockResolvedValueOnce([event])
      .mockResolvedValueOnce([salesOpportunity])
      .mockResolvedValueOnce([effortEstimate]);
    const em = {
      find,
    };
    const inboxService = {
      getUnreadNotifications: jest
        .fn<(_user: { handle: number }) => Promise<unknown[]>>()
        .mockResolvedValue([notification]),
    };
    const service = new CurrentService(em as never, inboxService as never);

    const result = await service.getOpenTaskSnapshot({
      handle: 7,
    } as never);

    expect(result).toEqual({
      count: 5,
      tickets: [ticket],
      tasks: [event],
      salesOpportunities: [salesOpportunity],
      effortEstimates: [effortEstimate],
      notifications: [notification],
    });
    expect(find).toHaveBeenCalledTimes(4);
    expect(find.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        assigneePerson: { handle: 7 },
        status: { handle: { $nin: ['closed'] } },
      }),
    );
    expect(find.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        participants: { handle: 7 },
        status: { handle: { $nin: ['canceled', 'completed'] } },
      }),
    );
    expect(find.mock.calls[2]?.[1]).toEqual(
      expect.objectContaining({
        assigneePerson: { handle: 7 },
        isActive: true,
      }),
    );
    expect(find.mock.calls[3]?.[1]).toEqual(
      expect.objectContaining({
        assigneePerson: { handle: 7 },
        isActive: true,
        status: { handle: { $nin: ['completed', 'cancelled'] } },
      }),
    );
    expect(inboxService.getUnreadNotifications).toHaveBeenCalledWith({
      handle: 7,
    });
  });
});
