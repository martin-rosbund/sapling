import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../entity/EntityItem', () => ({ EntityItem: class {} }));
jest.mock('../entity/PersonItem', () => ({ PersonItem: class {} }));
jest.mock('../entity/TicketItem', () => ({ TicketItem: class {} }));

import { TicketController } from './TicketController';
import type { TicketItem } from '../entity/TicketItem';
import { ScriptResultServerMethods } from './core/script.result.server';

describe('TicketController', () => {
  beforeEach(() => {
    global.log = {
      trace: jest.fn(),
      warn: jest.fn(),
    } as unknown as typeof global.log;
  });

  it('assigns a year-based ticket number after insert and returns overwrite', async () => {
    const items = [
      {
        handle: 42,
        createdAt: new Date('2026-04-19T10:15:00.000Z'),
      },
    ] as TicketItem[];
    const controller = new TicketController(
      { handle: 'ticket' } as never,
      { handle: 99 } as never,
      {} as never,
    );

    const result = await controller.afterInsert(items);

    expect(items[0].number).toBe('2026#00042');
    expect(result.items).toBe(items);
    expect(result.method).toBe(ScriptResultServerMethods.overwrite);
  });

  it('derives support defaults before insert', async () => {
    const contract = {
      handle: 17,
      defaultSupportQueue: {
        handle: 'helpdesk',
        team: { handle: 'ops' },
        defaultSlaPolicy: {
          handle: 'standard',
          firstResponseHours: 4,
          resolutionHours: 24,
        },
      },
      defaultSupportTeam: { handle: 'ops' },
      slaPolicy: {
        handle: 'standard',
        firstResponseHours: 4,
        resolutionHours: 24,
      },
    };
    const em = {
      find: jest.fn<() => Promise<object[]>>().mockResolvedValue([contract]),
      findOne: jest.fn<() => Promise<object | null>>().mockResolvedValue(null),
    };
    const controller = new TicketController(
      { handle: 'ticket' } as never,
      { handle: 99 } as never,
      em as never,
    );

    const result = await controller.beforeInsert([
      {
        creatorCompany: 5,
        startDate: '2026-04-27T08:00:00.000Z',
        status: 'open',
      },
    ] as unknown as TicketItem[]);
    const derivedTicket = result.items[0] as Record<string, unknown>;

    expect(result.method).toBe(ScriptResultServerMethods.overwrite);
    expect(derivedTicket).toMatchObject({
      contract: 17,
      supportQueue: 'helpdesk',
      supportTeam: 'ops',
      slaPolicy: 'standard',
    });
    expect(derivedTicket.firstResponseDueAt).toEqual(
      new Date('2026-04-27T12:00:00.000Z'),
    );
    expect(derivedTicket.resolutionDueAt).toEqual(
      new Date('2026-04-28T08:00:00.000Z'),
    );
  });

  it('uses current update item context for ticket SLA derivation', async () => {
    const em = {
      find: jest.fn<() => Promise<object[]>>().mockResolvedValue([]),
      findOne: jest.fn<() => Promise<object | null>>().mockResolvedValue({
        handle: 'priority',
        firstResponseHours: 2,
        resolutionHours: 8,
      }),
    };
    const controller = new TicketController(
      { handle: 'ticket' } as never,
      { handle: 99 } as never,
      em as never,
    );

    const result = await controller.beforeUpdate(
      [
        {
          slaPolicy: 'priority',
          status: 'inProgress',
        },
      ] as unknown as TicketItem[],
      {
        currentItems: [
          {
            startDate: '2026-04-27T08:00:00.000Z',
          },
        ],
      },
    );
    const derivedTicket = result.items[0] as Record<string, unknown>;

    expect(result.method).toBe(ScriptResultServerMethods.overwrite);
    expect(derivedTicket.firstResponseDueAt).toEqual(
      new Date('2026-04-27T10:00:00.000Z'),
    );
    expect(derivedTicket.resolutionDueAt).toEqual(
      new Date('2026-04-27T16:00:00.000Z'),
    );
    expect(derivedTicket.firstRespondedAt).toEqual(
      new Date('2026-04-27T08:00:00.000Z'),
    );
  });
});
