import { describe, expect, it, jest } from '@jest/globals';

import { AzureCalendarController } from './azure.calendar.controller';

describe('AzureCalendarController', () => {
  it('queues calendar deliveries for authenticated users', async () => {
    const azureCalendarService = {
      queueEvent: jest
        .fn<(...args: unknown[]) => Promise<{ handle: number }>>()
        .mockResolvedValue({ handle: 11 }),
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

  it('imports Outlook calendar events for the requested range', async () => {
    const result = { imported: 2, created: 1, updated: 1, skipped: 0 };
    const azureCalendarService = {
      importEvents: jest
        .fn<(...args: unknown[]) => Promise<typeof result>>()
        .mockResolvedValue(result),
    };
    const controller = new AzureCalendarController(
      azureCalendarService as never,
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
    expect(azureCalendarService.importEvents).toHaveBeenCalledWith(req.user, {
      startDateTime: new Date(dto.startDateTime),
      endDateTime: new Date(dto.endDateTime),
    });
  });
});
