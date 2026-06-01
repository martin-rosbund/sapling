import { describe, expect, it, jest } from '@jest/globals';
import {
  CalendarSyncSubscriptionService,
  calculateCalendarSyncRange,
  isCalendarSyncSubscriptionDue,
} from './calendar-sync-subscription.service';

describe('calendar sync subscription helpers', () => {
  it('calculates the current UTC day range', () => {
    const range = calculateCalendarSyncRange(
      'day',
      new Date('2026-06-03T15:30:00.000Z'),
    );

    expect(range).toEqual({
      startDateTime: new Date('2026-06-03T00:00:00.000Z'),
      endDateTime: new Date('2026-06-04T00:00:00.000Z'),
    });
  });

  it('calculates Monday-first UTC week ranges', () => {
    const range = calculateCalendarSyncRange(
      'week',
      new Date('2026-06-03T15:30:00.000Z'),
    );

    expect(range).toEqual({
      startDateTime: new Date('2026-06-01T00:00:00.000Z'),
      endDateTime: new Date('2026-06-08T00:00:00.000Z'),
    });
  });

  it('calculates the current UTC month range', () => {
    const range = calculateCalendarSyncRange(
      'month',
      new Date('2026-06-15T15:30:00.000Z'),
    );

    expect(range).toEqual({
      startDateTime: new Date('2026-06-01T00:00:00.000Z'),
      endDateTime: new Date('2026-07-01T00:00:00.000Z'),
    });
  });

  it('marks active subscriptions due only after their interval elapsed', () => {
    const now = new Date('2026-06-01T12:00:00.000Z');

    expect(
      isCalendarSyncSubscriptionDue(
        {
          isActive: true,
          intervalMinutes: 60,
          lastRunAt: new Date('2026-06-01T10:59:59.000Z'),
        },
        now,
      ),
    ).toBe(true);

    expect(
      isCalendarSyncSubscriptionDue(
        {
          isActive: true,
          intervalMinutes: 60,
          lastRunAt: new Date('2026-06-01T11:30:00.000Z'),
        },
        now,
      ),
    ).toBe(false);
  });

  it('lets the import service reload the session during automatic imports', async () => {
    const subscription: {
      handle: number;
      isActive: boolean;
      syncRange: 'week';
      person: {
        handle: number;
        isActive: boolean;
        type: { handle: string };
      };
      lastError?: string | null;
      lastImportedCount?: number;
    } = {
      handle: 7,
      isActive: true,
      syncRange: 'week',
      person: {
        handle: 3,
        isActive: true,
        type: { handle: 'azure' },
      },
    };
    const em = {
      fork: () => em,
      findOne: jest.fn(async () => subscription),
      flush: jest.fn(async () => undefined),
    };
    const azureCalendarService = {
      importEvents: jest
        .fn<(...args: unknown[]) => Promise<{
          imported: number;
          created: number;
          updated: number;
          skipped: number;
        }>>()
        .mockResolvedValue({
          imported: 2,
          created: 1,
          updated: 1,
          skipped: 0,
        }),
    };
    const service = new CalendarSyncSubscriptionService(
      em as never,
      azureCalendarService as never,
      { add: jest.fn() } as never,
    );

    await service.executeSubscriptionImport(7);

    expect(azureCalendarService.importEvents).toHaveBeenCalledWith(
      subscription.person,
      expect.objectContaining({
        startDateTime: expect.any(Date),
        endDateTime: expect.any(Date),
      }),
    );
    expect(subscription.lastError).toBeNull();
    expect(subscription.lastImportedCount).toBe(2);
  });
});
