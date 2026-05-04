import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../calendar/azure/azure.calendar.service', () => ({
  AzureCalendarService: class {},
}));
jest.mock('../calendar/google/google.calendar.service', () => ({
  GoogleCalendarService: class {},
}));
jest.mock('../entity/EntityItem', () => ({ EntityItem: class {} }));
jest.mock('../entity/EventItem', () => ({ EventItem: class {} }));
jest.mock('../entity/PersonItem', () => ({ PersonItem: class {} }));

import { EventController } from './EventController';
import type { EventItem } from '../entity/EventItem';
import type { PersonItem } from '../entity/PersonItem';
import { ScriptResultServerMethods } from './core/script.result.server';

const asMock = (value: unknown): jest.Mock => value as jest.Mock;

describe('EventController', () => {
  beforeEach(() => {
    global.log = {
      trace: jest.fn(),
      warn: jest.fn(),
    } as unknown as typeof global.log;
  });

  it('queues inserted events for azure users with a session', async () => {
    const azureQueueEvent = jest.fn(() => Promise.resolve(undefined));
    const googleQueueEvent = jest.fn(() => Promise.resolve(undefined));
    const azureCalendarService = {
      queueEvent: azureQueueEvent,
    };
    const googleCalendarService = {
      queueEvent: googleQueueEvent,
    };
    const user = {
      type: { handle: 'azure' },
      session: { provider: 'azure' },
    } as unknown as PersonItem;
    const items = [{ handle: 1 }, { handle: 2 }] as EventItem[];
    const controller = new EventController(
      { handle: 'event' } as never,
      user,
      {} as never,
      azureCalendarService as never,
      googleCalendarService as never,
    );

    const result = await controller.afterInsert(items);

    expect(asMock(azureQueueEvent)).toHaveBeenNthCalledWith(
      1,
      items[0],
      user.session,
    );
    expect(asMock(azureQueueEvent)).toHaveBeenNthCalledWith(
      2,
      items[1],
      user.session,
    );
    expect(asMock(googleQueueEvent)).not.toHaveBeenCalled();
    expect(result.items).toBe(items);
    expect(result.method).toBe(ScriptResultServerMethods.none);
  });

  it('defaults empty participants to assignee and creator before create', async () => {
    const controller = new EventController(
      { handle: 'event' } as never,
      { handle: 1 } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const items = [
      {
        assigneePerson: 10,
        creatorPerson: { handle: 11 },
        participants: [],
      },
    ] as unknown as EventItem[];

    const result = await controller.beforeInsert(items);

    expect(result.items).toBe(items);
    expect(result.method).toBe(ScriptResultServerMethods.overwrite);
    expect(
      (items[0] as unknown as { participants: number[] }).participants,
    ).toEqual([10, 11]);
  });

  it('does not duplicate participants when assignee and creator are the same person', async () => {
    const controller = new EventController(
      { handle: 'event' } as never,
      { handle: 1 } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const items = [
      {
        assigneePerson: { handle: 10 },
        creatorPerson: 10,
      },
    ] as unknown as EventItem[];

    await controller.beforeInsert(items);

    expect(
      (items[0] as unknown as { participants: number[] }).participants,
    ).toEqual([10]);
  });

  it('keeps explicit participants before create', async () => {
    const controller = new EventController(
      { handle: 'event' } as never,
      { handle: 1 } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const items = [
      {
        assigneePerson: 10,
        creatorPerson: 11,
        participants: [12],
      },
    ] as unknown as EventItem[];

    await controller.beforeInsert(items);

    expect(
      (items[0] as unknown as { participants: number[] }).participants,
    ).toEqual([12]);
  });

  it('queues updated events for google users with a session', async () => {
    const azureQueueEvent = jest.fn(() => Promise.resolve(undefined));
    const googleQueueEvent = jest.fn(() => Promise.resolve(undefined));
    const azureCalendarService = {
      queueEvent: azureQueueEvent,
    };
    const googleCalendarService = {
      queueEvent: googleQueueEvent,
    };
    const user = {
      type: { handle: 'google' },
      session: { provider: 'google' },
    } as unknown as PersonItem;
    const items = [{ handle: 5 }] as EventItem[];
    const controller = new EventController(
      { handle: 'event' } as never,
      user,
      {} as never,
      azureCalendarService as never,
      googleCalendarService as never,
    );

    const result = await controller.afterUpdate(items);

    expect(asMock(googleQueueEvent)).toHaveBeenCalledWith(
      items[0],
      user.session,
    );
    expect(asMock(azureQueueEvent)).not.toHaveBeenCalled();
    expect(result.items).toBe(items);
    expect(result.method).toBe(ScriptResultServerMethods.none);
  });
});
