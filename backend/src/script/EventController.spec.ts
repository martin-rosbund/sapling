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

describe('EventController', () => {
  beforeEach(() => {
    global.log = {
      trace: jest.fn(),
      warn: jest.fn(),
    } as unknown as typeof global.log;
  });

  it('queues inserted events for azure users with a session', async () => {
    const azureQueueEvent = jest.fn(
      (_event: unknown, _session: unknown) => Promise.resolve(undefined),
    );
    const googleQueueEvent = jest.fn(
      (_event: unknown, _session: unknown) => Promise.resolve(undefined),
    );
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

    expect(azureQueueEvent).toHaveBeenNthCalledWith(
      1,
      items[0],
      user.session,
    );
    expect(azureQueueEvent).toHaveBeenNthCalledWith(
      2,
      items[1],
      user.session,
    );
    expect(googleQueueEvent).not.toHaveBeenCalled();
    expect(result.items).toBe(items);
    expect(result.method).toBe(ScriptResultServerMethods.none);
  });

  it('queues updated events for google users with a session', async () => {
    const azureQueueEvent = jest.fn(
      (_event: unknown, _session: unknown) => Promise.resolve(undefined),
    );
    const googleQueueEvent = jest.fn(
      (_event: unknown, _session: unknown) => Promise.resolve(undefined),
    );
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

    expect(googleQueueEvent).toHaveBeenCalledWith(
      items[0],
      user.session,
    );
    expect(azureQueueEvent).not.toHaveBeenCalled();
    expect(result.items).toBe(items);
    expect(result.method).toBe(ScriptResultServerMethods.none);
  });
});