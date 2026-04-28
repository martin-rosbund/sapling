import { describe, expect, it } from 'vitest'

import type { SaplingGenericItem } from '@/entity/entity'
import type { DialogState, EntityState, EntityTemplate, SortItem } from '@/entity/structure'

import {
  buildTableFilter,
  buildTableOrderBy,
  getAllowedColumnFilterOperators,
  getCompactLabel,
  getDefaultColumnFilterOperatorForTemplate,
  getEditDialogHeaders,
  getRelationTableHeaders,
  getTableHeaders,
  isBooleanTemplate,
  isDateTemplate,
  isFilterableTableColumn,
  isManyToOneTemplate,
  isNumericTemplate,
  isRangeTemplate,
  isTextSearchableTemplate,
  isTimeTemplate,
} from '../saplingTableUtil'

function createTemplate(overrides: Partial<EntityTemplate> = {}): EntityTemplate {
  const name = overrides.name ?? overrides.key ?? 'title'

  return {
    key: overrides.key ?? name,
    name,
    type: overrides.type ?? 'StringType',
    ...overrides,
  }
}

function createRelationState(entityHandle: string, templates: EntityTemplate[]): EntityState {
  return {
    entity: { handle: entityHandle } as EntityState['entity'],
    entityPermission: null,
    entityTranslation: null as never,
    entityTemplates: templates,
    isLoading: false,
    currentEntityName: entityHandle,
    currentNamespaces: [],
  }
}

describe('saplingTableUtil', () => {
  it('builds visible headers for relation and standalone tables', () => {
    const visibleTemplate = createTemplate({ name: 'title' })
    const hiddenTemplate = createTemplate({ name: 'secret', options: ['isSystem'] })
    const unreadableReferenceTemplate = createTemplate({
      name: 'salesOpportunity',
      kind: 'm:1',
      referenceName: 'salesOpportunity',
    })
    const translate = (key: string) => `translated:${key}`

    expect(
      getRelationTableHeaders(
        {
          tickets: createRelationState('ticket', [
            visibleTemplate,
            hiddenTemplate,
            unreadableReferenceTemplate,
          ]),
        },
        translate,
        [{ entityHandle: 'salesOpportunity', allowRead: false }],
      ).tickets,
    ).toEqual([expect.objectContaining({ key: 'title', title: 'translated:ticket.title' })])

    expect(
      getTableHeaders([visibleTemplate, hiddenTemplate], { handle: 'ticket' } as never, translate),
    ).toEqual([expect.objectContaining({ key: 'title', title: 'translated:ticket.title' })])
  })

  it('filters edit dialog headers by mode, reference visibility, and permissions', () => {
    const templates = [
      createTemplate({ name: 'handle' }),
      createTemplate({
        name: 'company',
        kind: 'm:1',
        referenceName: 'company',
        isReference: true,
      }),
    ]

    expect(getEditDialogHeaders(templates, 'create' as DialogState, false)).toEqual([
      expect.objectContaining({ name: 'handle' }),
    ])
    expect(
      getEditDialogHeaders(templates, 'edit' as DialogState, true, [
        { entityHandle: 'company', allowRead: true },
      ]),
    ).toEqual([expect.objectContaining({ name: 'company' })])
  })

  it('classifies filterable and typed templates correctly', () => {
    const relationTemplate = createTemplate({
      name: 'company',
      kind: 'm:1',
      referenceName: 'company',
    })
    const computedTemplate = createTemplate({ name: 'creatorPersonEmail', isPersistent: false })
    const booleanTemplate = createTemplate({ name: 'isActive', type: 'Boolean' })
    const dateTemplate = createTemplate({ name: 'createdAt', type: 'DateTime' })
    const timeTemplate = createTemplate({ name: 'startTime', type: 'Time' })
    const numericTemplate = createTemplate({ name: 'amount', type: 'Decimal' })
    const iconTemplate = createTemplate({ name: 'icon', options: ['isIcon'] })

    expect(isFilterableTableColumn(relationTemplate)).toBe(true)
    expect(isFilterableTableColumn(computedTemplate)).toBe(false)
    expect(isFilterableTableColumn(createTemplate({ key: '__actions' }))).toBe(false)
    expect(isManyToOneTemplate(relationTemplate)).toBe(true)
    expect(isBooleanTemplate(booleanTemplate)).toBe(true)
    expect(isDateTemplate(dateTemplate)).toBe(true)
    expect(isTimeTemplate(timeTemplate)).toBe(true)
    expect(isNumericTemplate(numericTemplate)).toBe(true)
    expect(isRangeTemplate(dateTemplate)).toBe(true)
    expect(isTextSearchableTemplate(createTemplate({ name: 'title' }))).toBe(true)
    expect(isTextSearchableTemplate(iconTemplate)).toBe(false)
  })

  it('returns operators based on template type', () => {
    expect(getDefaultColumnFilterOperatorForTemplate(createTemplate({ type: 'Boolean' }))).toBe(
      'eq',
    )
    expect(getDefaultColumnFilterOperatorForTemplate(createTemplate({ type: 'StringType' }))).toBe(
      'like',
    )
    expect(getAllowedColumnFilterOperators(createTemplate({ type: 'Decimal' }))).toEqual([
      'eq',
      'gt',
      'gte',
      'lt',
      'lte',
    ])
  })

  it('builds search filters only from text-searchable columns', () => {
    const filter = buildTableFilter({
      search: 'Alice',
      entityTemplates: [
        createTemplate({ name: 'title' }),
        createTemplate({ name: 'creatorPersonEmail', isPersistent: false }),
        createTemplate({ name: 'amount', type: 'Decimal' }),
      ],
    })

    expect(filter).toEqual({
      $or: [{ title: { $ilike: '%Alice%' } }],
    })
  })

  it('builds numeric, relation, and date range filters', () => {
    const amountTemplate = createTemplate({ name: 'amount', type: 'Decimal' })
    const companyTemplate = createTemplate({
      name: 'company',
      kind: 'm:1',
      referenceName: 'company',
      referencedPks: ['id'],
    })
    const createdAtTemplate = createTemplate({ name: 'createdAt', type: 'Date' })
    const rangeEndExclusive = new Date('2026-04-02T00:00:00')
    rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1)

    expect(
      buildTableFilter({
        columnFilters: { amount: '42' },
        entityTemplates: [amountTemplate],
      }),
    ).toEqual({ amount: { $eq: 42 } })

    expect(
      buildTableFilter({
        columnFilters: {
          company: {
            operator: 'eq',
            value: '',
            relationItems: [{ id: 5 }],
          },
        },
        entityTemplates: [companyTemplate],
      }),
    ).toEqual({ company: { $in: [5] } })

    expect(
      buildTableFilter({
        columnFilters: {
          createdAt: {
            operator: 'eq',
            value: '',
            rangeStart: '2026-04-01',
            rangeEnd: '2026-04-02',
          },
        },
        entityTemplates: [createdAtTemplate],
      }),
    ).toEqual({
      $and: [
        { createdAt: { $gte: '2026-04-01' } },
        { createdAt: { $lt: rangeEndExclusive.toISOString().slice(0, 10) } },
      ],
    })
  })

  it('builds order-by clauses and compact labels', () => {
    const sortBy: SortItem[] = [
      { key: 'title', order: 'asc' },
      { key: '__actions', order: 'desc' },
      { key: 'createdAt', order: 'desc' },
    ]
    const item: SaplingGenericItem = {
      title: 'Ticket A',
      startTime: '09:30:59',
    }

    expect(buildTableOrderBy(sortBy)).toEqual({
      title: 'ASC',
      createdAt: 'DESC',
    })
    expect(
      getCompactLabel(item, [
        createTemplate({ name: 'title', options: ['isShowInCompact'] }),
        createTemplate({ name: 'startTime', type: 'time', options: ['isShowInCompact'] }),
      ]),
    ).toBe('Ticket A 09:30')
  })
})
