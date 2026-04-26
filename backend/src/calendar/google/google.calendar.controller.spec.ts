import { describe, expect, it, jest } from '@jest/globals';

import { GoogleCalendarController } from './google.calendar.controller';

describe('GoogleCalendarController', () => {
  it('queues calendar deliveries for authenticated users', async () => {
    const googleCalendarService = {
      queueEvent: jest.fn().mockResolvedValue({ handle: 7 }),
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
});
