import { describe, expect, it } from 'vitest'
import type { ColumnFilterItem, EntityTemplate } from '@/entity/structure'
import {
  cloneColumnFilters,
  extractColumnFiltersFromFilterQuery,
  isEmptyColumnFilterItem,
  normalizeColumnFilterItem,
  normalizeTableColumnTemplate,
} from '../useSaplingTableFilterHelpers'

describe('useSaplingTableFilterHelpers', () => {
  it('normalizes table columns to the supported entity template shape', () => {
    const normalized = normalizeTableColumnTemplate({
      key: 'budget',
      name: 'budget',
      type: 'number',
      options: ['isMoney', 42, null],
      referencedPks: ['handle', 99],
      isReference: true,
      referenceName: 'company',
    })

    expect(normalized).toEqual({
      key: 'budget',
      name: 'budget',
      type: 'number',
      kind: undefined,
      referenceName: 'company',
      referencedPks: ['handle'],
      length: undefined,
      options: ['isMoney'],
      isReference: true,
    })
  })

  it('normalizes filter values and falls back to the template default operator', () => {
    const templates = [createTemplate({ name: 'title', type: 'string' })]
    const filter: ColumnFilterItem = {
      operator: 'gt',
      value: '  hello  ',
      rangeStart: '  1 ',
      rangeEnd: ' 3  ',
      relationItems: [{ handle: 7, name: 'Alpha' }],
    }

    expect(normalizeColumnFilterItem(templates, 'title', filter)).toEqual({
      operator: 'like',
      value: 'hello',
      rangeStart: '1',
      rangeEnd: '3',
      relationItems: [{ handle: 7, name: 'Alpha' }],
    })
  })

  it('clones relation arrays and detects empty filters', () => {
    const filters = {
      company: {
        operator: 'eq',
        value: '',
        relationItems: [{ handle: 1, name: 'Sapling' }],
      } satisfies ColumnFilterItem,
    }

    const cloned = cloneColumnFilters(filters)

    expect(cloned).toEqual(filters)
    expect(cloned.company.relationItems).not.toBe(filters.company.relationItems)
    expect(
      isEmptyColumnFilterItem({
        operator: 'eq',
        value: '',
        rangeStart: '',
        rangeEnd: '',
        relationItems: [],
      }),
    ).toBe(true)
    expect(isEmptyColumnFilterItem(cloned.company)).toBe(false)
  })

  it('rehydrates favorite-style url filters into full table header filters', () => {
    const templates = [
      createTemplate({
        name: 'status',
        type: 'string',
        kind: 'm:1',
        referenceName: 'ticketStatus',
        referencedPks: ['handle'],
      }),
      createTemplate({
        name: 'deadlineDate',
        type: 'date',
      }),
      createTemplate({
        name: 'assigneePerson',
        type: 'string',
        kind: 'm:1',
        referenceName: 'person',
        referencedPks: ['handle'],
      }),
    ]

    const filterQuery = {
      status: {
        handle: {
          $nin: ['closed'],
        },
      },
      deadlineDate: {
        $lt: '{{tomorrow.start}}',
        $gte: '{{today.start}}',
      },
      assigneePerson: {
        handle: '{{currentUser.handle}}',
      },
    }

    expect(extractColumnFiltersFromFilterQuery(templates, filterQuery)).toEqual({
      status: {
        operator: 'nin',
        value: '',
        relationItems: [{ handle: 'closed' }],
      },
      deadlineDate: {
        operator: 'between',
        value: '',
        rangeStart: '{{today.start}}',
        rangeEnd: '{{tomorrow.start}}',
        rangeStartOperator: 'gte',
        rangeEndOperator: 'lt',
      },
      assigneePerson: {
        operator: 'eq',
        value: '',
        relationItems: [{ handle: '{{currentUser.handle}}' }],
      },
    })
  })

  it('rehydrates ISO datetime url filters as datetime-local input values', () => {
    const templates = [
      createTemplate({
        name: 'startDate',
        type: 'datetime',
      }),
      createTemplate({
        name: 'endDate',
        type: 'datetime',
      }),
    ]
    const monthStartUtc = '2026-06-30T22:00:00.000Z'
    const nextMonthStartUtc = '2026-07-31T22:00:00.000Z'

    expect(
      extractColumnFiltersFromFilterQuery(templates, {
        $and: [{ startDate: { $lt: nextMonthStartUtc } }, { endDate: { $gte: monthStartUtc } }],
      }),
    ).toEqual({
      startDate: {
        operator: 'lt',
        value: formatLocalDateTimeInput(nextMonthStartUtc),
      },
      endDate: {
        operator: 'gte',
        value: formatLocalDateTimeInput(monthStartUtc),
      },
    })
  })
})

function formatLocalDateTimeInput(value: string): string {
  const date = new Date(value)

  return (
    [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-') +
    `T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  )
}

function createTemplate(
  overrides: Partial<EntityTemplate> & Pick<EntityTemplate, 'name' | 'type'>,
): EntityTemplate {
  return {
    name: overrides.name,
    key: overrides.name,
    title: overrides.name,
    type: overrides.type,
    kind: overrides.kind,
    options: overrides.options ?? [],
    isAutoIncrement: false,
    isPersistent: true,
    isReference: overrides.isReference ?? false,
    referencedPks: overrides.referencedPks ?? [],
    referenceName: overrides.referenceName,
    length: overrides.length,
  } as EntityTemplate
}
