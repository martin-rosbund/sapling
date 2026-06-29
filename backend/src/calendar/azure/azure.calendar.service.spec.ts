import { describe, expect, it, jest } from '@jest/globals';

import { AzureCalendarService } from './azure.calendar.service';
import { EventItem } from '../../entity/EventItem';

type UpsertResult = 'created' | 'updated' | 'skipped';
type AzureCalendarServiceTestHarness = {
  upsertImportedEvent: (
    emFork: object,
    graphEvent: object,
    defaults: object,
  ) => Promise<UpsertResult>;
};

const defaults = {
  user: {
    handle: 7,
    company: { handle: 42 },
  },
  type: { handle: 'internal' },
  scheduledStatus: { handle: 'scheduled' },
  canceledStatus: { handle: 'canceled' },
};

function createGraphEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'outlook-1',
    subject: 'Planning',
    bodyPreview: 'Details',
    start: { dateTime: '2026-06-29T09:00:00.000Z' },
    end: { dateTime: '2026-06-29T10:00:00.000Z' },
    isAllDay: false,
    isCancelled: false,
    attendees: [],
    ...overrides,
  };
}

function createService(): AzureCalendarServiceTestHarness {
  return new AzureCalendarService(
    {} as never,
    {} as never,
  ) as unknown as AzureCalendarServiceTestHarness;
}

describe('AzureCalendarService Outlook import privacy', () => {
  it('imports private Outlook sensitivity as a private Sapling event', async () => {
    const persisted: unknown[] = [];
    const emFork = {
      findOne: jest.fn<(...args: unknown[]) => Promise<unknown>>(
        async () => null,
      ),
      find: jest.fn<(...args: unknown[]) => Promise<unknown[]>>(async () => []),
      persist: jest.fn((item: unknown) => {
        persisted.push(item);
      }),
    };
    const service = createService();

    await expect(
      service.upsertImportedEvent(
        emFork,
        createGraphEvent({ sensitivity: 'private' }),
        defaults,
      ),
    ).resolves.toBe('created');

    const event = persisted.find((item) => item instanceof EventItem) as
      | EventItem
      | undefined;
    expect(event?.isPrivate).toBe(true);
    expect(event?.title).toBe('Planning');
    expect(event?.description).toBe('Details');
  });

  it('imports non-private, missing, and unknown Outlook sensitivity as public events', async () => {
    const service = createService();

    for (const sensitivity of ['normal', undefined, 'confidential']) {
      const persisted: unknown[] = [];
      const emFork = {
        findOne: jest.fn<(...args: unknown[]) => Promise<unknown>>(
          async () => null,
        ),
        find: jest.fn<(...args: unknown[]) => Promise<unknown[]>>(
          async () => [],
        ),
        persist: jest.fn((item: unknown) => {
          persisted.push(item);
        }),
      };

      await expect(
        service.upsertImportedEvent(
          emFork,
          createGraphEvent({ id: `outlook-${String(sensitivity)}`, sensitivity }),
          defaults,
        ),
      ).resolves.toBe('created');

      const event = persisted.find((item) => item instanceof EventItem) as
        | EventItem
        | undefined;
      expect(event?.isPrivate).toBe(false);
    }
  });

  it('updates an existing Outlook-linked event when privacy changes', async () => {
    const existingEvent = new EventItem();
    existingEvent.title = 'Old title';
    existingEvent.isPrivate = false;
    const emFork = {
      findOne: jest.fn<(...args: unknown[]) => Promise<unknown>>(
        async () => ({ event: existingEvent }),
      ),
      find: jest.fn<(...args: unknown[]) => Promise<unknown[]>>(async () => []),
      persist: jest.fn(),
    };
    const service = createService();

    await expect(
      service.upsertImportedEvent(
        emFork,
        createGraphEvent({ sensitivity: 'private' }),
        defaults,
      ),
    ).resolves.toBe('updated');

    expect(existingEvent.isPrivate).toBe(true);
    expect(existingEvent.title).toBe('Planning');
    expect(emFork.persist).not.toHaveBeenCalled();
  });
});
