import { describe, expect, it, jest } from '@jest/globals';

import { AzureCalendarController } from './azure.calendar.controller';

describe('AzureCalendarController', () => {
  it('queues calendar deliveries for authenticated users', async () => {
    const azureCalendarService = {
      queueEvent: jest.fn().mockResolvedValue({ handle: 11 }),
    };
    const controller = new AzureCalendarController(
      azureCalendarService as never,
    );
    const req = {
      user: {
        handle: 1,
        session: { provider: 'azure' },
      },
    };
    const event = { handle: 21 };

    await expect(
      controller.triggerEvent(req as never, event as never),
    ).resolves.toEqual({
      message: 'Azure calendar event queued',
      jobId: 11,
    });
    expect(azureCalendarService.queueEvent).toHaveBeenCalledWith(
      event,
      req.user.session,
    );
  });

  it('rejects requests without a session', async () => {
    const controller = new AzureCalendarController({} as never);

    await expect(
      controller.triggerEvent(
        { user: { handle: 1 } } as never,
        { handle: 21 } as never,
      ),
    ).rejects.toThrow('global.authenticationFailed');
  });
});
