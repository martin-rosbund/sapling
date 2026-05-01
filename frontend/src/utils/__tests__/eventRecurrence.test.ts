import { describe, expect, it } from 'vitest'
import { buildRecurrenceRule, expandRecurringEvent, parseRecurrenceRule } from '../eventRecurrence'

describe('eventRecurrence', () => {
  it('builds weekly RRULE strings with weekdays and count', () => {
    expect(
      buildRecurrenceRule({
        frequency: 'WEEKLY',
        interval: 1,
        weekdays: ['MO', 'WE'],
        endMode: 'count',
        count: 8,
        startDate: '2026-05-04',
        startTime: '09:30',
      }),
    ).toBe('FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE;COUNT=8')
  })

  it('parses stored RRULE strings', () => {
    expect(parseRecurrenceRule('RRULE:FREQ=MONTHLY;INTERVAL=1;COUNT=6')).toEqual({
      raw: 'FREQ=MONTHLY;INTERVAL=1;COUNT=6',
      frequency: 'MONTHLY',
      interval: 1,
      byDay: [],
      count: 6,
    })
  })

  it('expands recurring events into occurrences inside the visible range', () => {
    const occurrences = expandRecurringEvent(
      {
        handle: 9,
        title: 'Support Sync',
        startDate: new Date('2026-05-04T09:30:00.000Z'),
        endDate: new Date('2026-05-04T10:30:00.000Z'),
        isAllDay: false,
        recurrenceRule: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE;COUNT=5',
        type: { color: '#00897B' } as never,
        status: { color: '#43A047' } as never,
        creatorPerson: {} as never,
        creatorCompany: {} as never,
        transactionHandle: "abc123",
      },
      new Date('2026-05-10T00:00:00.000Z'),
      new Date('2026-05-20T23:59:59.999Z'),
    )

    expect(occurrences).toHaveLength(3)
    expect(occurrences.map((item) => new Date(item.start).toISOString())).toEqual([
      '2026-05-11T09:30:00.000Z',
      '2026-05-13T09:30:00.000Z',
      '2026-05-18T09:30:00.000Z',
    ])
    expect(occurrences.every((item) => item.isRecurringOccurrence === true)).toBe(true)
  })
})
