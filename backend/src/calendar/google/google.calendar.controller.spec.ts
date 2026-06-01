import { describe, expect, it, jest } from '@jest/globals';

import { GoogleCalendarController } from './google.calendar.controller';

describe('GoogleCalendarController', () => {
  it('queues calendar deliveries for authenticated users', async () => {
    const googleCalendarService = {
      queueEvent: jest
        .fn<(...args: unknown[]) => Promise<{ handle: number }>>()
        .mockResolvedValue({ handle: 7 }),
    };
    const controller = new GoogleCalendarController(
      googleCalendarService as never,
    );
    const req = {
      user: {
        handle: 1,
        session: { provider: 'google' },
      },
    };
    const event = { handle: 12 };

    await expect(
      controller.triggerEvent(req as never, event as never),
    ).resolves.toEqual({
      message: 'Google calendar event queued',
      jobId: 7,
    });
    expect(googleCalendarService.queueEvent).toHaveBeenCalledWith(
      event,
      req.user.session,
    );
  });

  it('rejects requests without a session', async () => {
    const controller = new GoogleCalendarController({} as never);

    await expect(
      controller.triggerEvent(
        { user: { handle: 1 } } as never,
        { handle: 12 } as never,
      ),
    ).rejects.toThrow('global.authenticationFailed');
  });

  it('imports Google calendar events for the requested range', async () => {
    const result = { imported: 3, created: 2, updated: 1, skipped: 0 };
    const googleCalendarService = {
      importEvents: jest
        .fn<(...args: unknown[]) => Promise<typeof result>>()
        .mockResolvedValue(result),
    };
    const controller = new GoogleCalendarController(
      googleCalendarService as never,
    );
    const req = {
      user: {
        handle: 1,
      },
    };
    const dto = {
      startDateTime: '2026-06-01T00:00:00.000Z',
      endDateTime: '2026-06-07T23:59:59.999Z',
    };

    await expect(controller.importEvents(req as never, dto)).resolves.toEqual(
      result,
    );
    expect(googleCalendarService.importEvents).toHaveBeenCalledWith(req.user, {
      startDateTime: new Date(dto.startDateTime),
      endDateTime: new Date(dto.endDateTime),
    });
  });
});
