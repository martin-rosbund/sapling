import { describe, expect, it } from '@jest/globals';
import {
  buildAzureRecurrence,
  buildGoogleRecurrence,
  parseRecurrenceRule,
} from './calendar.recurrence';

describe('calendar.recurrence', () => {
  it('parses weekly recurrence rules with interval, weekdays, and count', () => {
    const parsed = parseRecurrenceRule(
      'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR;COUNT=8',
    );

    expect(parsed).toEqual({
      raw: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR;COUNT=8',
      frequency: 'WEEKLY',
      interval: 2,
      byDay: ['MO', 'WE', 'FR'],
      count: 8,
    });
  });

  it('builds the Google recurrence payload from a stored RRULE', () => {
    expect(
      buildGoogleRecurrence('RRULE:FREQ=MONTHLY;INTERVAL=1;COUNT=3'),
    ).toEqual(['RRULE:FREQ=MONTHLY;INTERVAL=1;COUNT=3']);
  });

  it('maps weekly recurrence rules to a Microsoft Graph recurrence payload', () => {
    const recurrence = buildAzureRecurrence(
      new Date('2026-05-04T09:30:00.000Z'),
      'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE;UNTIL=20260630T093000Z',
    );

    expect(recurrence).toEqual({
      pattern: {
        type: 'weekly',
        interval: 1,
        daysOfWeek: ['monday', 'wednesday'],
        firstDayOfWeek: 'monday',
      },
      range: {
        type: 'endDate',
        startDate: '2026-05-04',
        endDate: '2026-06-30',
        recurrenceTimeZone: 'UTC',
      },
    });
  });
});
