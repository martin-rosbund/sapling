import { describe, expect, it } from 'vitest'

import type { PersonItem } from '@/entity/entity'

import { resolveDynamicFilter } from '../saplingDynamicFilter'

function createPerson(overrides: Partial<PersonItem> = {}): PersonItem {
  return {
    handle: 7,
    firstName: 'Ada',
    lastName: 'Lovelace',
    company: { handle: 11 },
    createdAt: null,
    ...overrides,
  } as PersonItem
}

function toIsoAtStartOfLocalDay(year: number, monthIndex: number, day: number) {
  const value = new Date(year, monthIndex, day)
  value.setHours(0, 0, 0, 0)
  return value.toISOString()
}

describe('saplingDynamicFilter', () => {
  it('replaces current person and current company placeholders recursively', () => {
    expect(
      resolveDynamicFilter(
        {
          assigneePerson: { handle: '{{currentPerson.handle}}' },
          assigneeCompany: { handle: '{{currentCompany.handle}}' },
        },
        { currentPerson: createPerson() },
      ),
    ).toEqual({
      assigneePerson: { handle: 7 },
      assigneeCompany: { handle: 11 },
    })
  })

  it('replaces relative date placeholders with ISO timestamps', () => {
    const resolved = resolveDynamicFilter(
      {
        startDate: {
          $gte: '{{today.start}}',
          $lt: '{{tomorrow.start}}',
        },
        createdAt: {
          $gte: '{{week.start}}',
          $lt: '{{week.end}}',
        },
        monthWindow: {
          $gte: '{{month.start}}',
          $lt: '{{month.end}}',
        },
      },
      { referenceDate: new Date('2026-05-06T10:00:00.000Z') },
    )

    expect(resolved).toEqual({
      startDate: {
        $gte: toIsoAtStartOfLocalDay(2026, 4, 6),
        $lt: toIsoAtStartOfLocalDay(2026, 4, 7),
      },
      createdAt: {
        $gte: toIsoAtStartOfLocalDay(2026, 4, 4),
        $lt: toIsoAtStartOfLocalDay(2026, 4, 11),
      },
      monthWindow: {
        $gte: toIsoAtStartOfLocalDay(2026, 4, 1),
        $lt: toIsoAtStartOfLocalDay(2026, 5, 1),
      },
    })
  })

  it('leaves unknown values unchanged', () => {
    expect(resolveDynamicFilter({ status: 'open', handle: '{{unknown}}' })).toEqual({
      status: 'open',
      handle: '{{unknown}}',
    })
  })
})
