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
});