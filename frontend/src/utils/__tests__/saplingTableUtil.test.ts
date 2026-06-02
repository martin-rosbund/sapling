import { describe, expect, it } from 'vitest'

import type { SaplingGenericItem } from '@/entity/entity'
import type { DialogState, EntityState, EntityTemplate, SortItem } from '@/entity/structure'

import {
  buildTableFilter,
  buildTableOrderBy,
  canReadReferenceTemplate,
  filterTableHeadersByReferencePermission,
  getAllowedColumnFilterOperators,
  getEntityValueLabel,
  getDefaultColumnFilterOperatorForTemplate,
  getEditDialogHeaders,
  getGenericReferenceEntityHandle,
  getGenericReferenceHandle,
  getMobileTableHeaders,
  getReadableReferenceRelationNames,
  getRelationTableHeaders,
  getSupportedTableHeaders,
  getTableHeaders,
  isBooleanTemplate,
  isDateTemplate,
  isFilterableTableColumn,
  isGenericReferenceTemplate,
  isManyToOneTemplate,
  isNumericTemplate,
  isRangeTemplate,
  isVisibleTableTemplate,
  isTextSearchableTemplate,
  isTimeTemplate,
} from '../saplingTableUtil'

function createTemplate(overrides: Partial<EntityTemplate> = {}): EntityTemplate {
  const name = overrides.name ?? overrides.key ?? 'title'

  return {
    key: overrides.key ?? name,
    name,
    type: overrides.type ?? 'StringType',
    formVisible: overrides.formVisible ?? true,
    tableVisible: overrides.tableVisible ?? true,
    mobileVisible: overrides.mobileVisible ?? false,
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
    const hiddenTemplate = createTemplate({
      name: 'secret',
      options: ['isSystem'],
      formVisible: false,
      tableVisible: false,
    })
    const unreadableReferenceTemplate = createTemplate({
      name: 'salesOpportunity',
      kind: 'm:1',
      referenceName: 'salesOpportunity',
    })
    const readableReferenceTemplate = createTemplate({
      name: 'company',
      kind: 'm:1',
      referenceName: 'company',
    })
    const unreadableOneToOneTemplate = createTemplate({
      name: 'primaryContact',
      kind: '1:1',
      referenceName: 'person',
    })
    const translate = (key: string) => `translated:${key}`
    const permissions = [
      { entityHandle: 'company', allowRead: true },
      { entityHandle: 'salesOpportunity', allowRead: false },
    ]

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
        permissions,
      ).tickets,
    ).toEqual([expect.objectContaining({ key: 'title', title: 'translated:ticket.title' })])

    expect(
      getTableHeaders(
        [visibleTemplate, hiddenTemplate, readableReferenceTemplate, unreadableReferenceTemplate],
        { handle: 'ticket' } as never,
        translate,
        permissions,
      ),
    ).toEqual([
      expect.objectContaining({ key: 'title', title: 'translated:ticket.title' }),
      expect.objectContaining({ key: 'company', title: 'translated:ticket.company' }),
    ])

    expect(canReadReferenceTemplate(readableReferenceTemplate, permissions)).toBe(true)
    expect(canReadReferenceTemplate(unreadableReferenceTemplate, permissions)).toBe(false)
    expect(canReadReferenceTemplate(unreadableOneToOneTemplate, permissions)).toBe(false)
    expect(
      filterTableHeadersByReferencePermission(
        [readableReferenceTemplate, unreadableReferenceTemplate, unreadableOneToOneTemplate],
        permissions,
      ),
    ).toEqual([readableReferenceTemplate])
    expect(
      getReadableReferenceRelationNames(
        [readableReferenceTemplate, unreadableReferenceTemplate, unreadableOneToOneTemplate],
        permissions,
      ),
    ).toEqual(['company'])
  })

  it('applies configured table visibility and column order', () => {
    const templates = [
      createTemplate({ name: 'hidden', tableVisible: false }),
      createTemplate({ name: 'longNotes', length: 512, tableVisible: true, tableOrder: 20 }),
      createTemplate({ name: 'title', tableOrder: 10 }),
    ]

    expect(isVisibleTableTemplate(templates[0])).toBe(false)
    expect(isVisibleTableTemplate(templates[1])).toBe(true)
    expect(
      getTableHeaders(templates, { handle: 'ticket' } as never, (key) => key).map(
        (header) => header.key,
      ),
    ).toEqual(['title', 'longNotes'])
  })

  it('keeps early entity groups ahead of later groups when sorting table columns', () => {
    const templates = [
      createTemplate({
        name: 'contract',
        formGroupOrder: 450,
        tableOrder: 50,
      }),
      createTemplate({
        name: 'number',
        formGroupOrder: 100,
        tableOrder: 100,
      }),
      createTemplate({
        name: 'status',
        formGroupOrder: 100,
        tableOrder: 400,
      }),
      createTemplate({
        name: 'slaPolicy',
        formGroupOrder: 500,
        tableOrder: 100,
      }),
    ]

    expect(
      getTableHeaders(templates, { handle: 'ticket' } as never, (key) => key).map(
        (header) => header.key,
      ),
    ).toEqual(['number', 'status', 'contract', 'slaPolicy'])
  })

  it('builds mobile headers from mobile visibility independently of table visibility', () => {
    const templates = [
      createTemplate({ name: 'summary', tableOrder: 20 }),
      createTemplate({
        name: 'title',
        options: ['isValue'],
        tableOrder: 10,
        mobileVisible: true,
      }),
      createTemplate({
        name: 'hiddenValue',
        options: ['isValue'],
        tableVisible: false,
        tableOrder: 30,
        mobileVisible: true,
      }),
      createTemplate({
        name: 'mobileOnly',
        tableVisible: false,
        mobileVisible: true,
        mobileOrder: 5,
      }),
      createTemplate({ name: 'suppressedMobile', mobileVisible: false, tableOrder: 1 }),
    ]
    const translate = (key: string) => key
    const supportedHeaders = getSupportedTableHeaders(
      templates,
      { handle: 'ticket' } as never,
      translate,
    )
    const desktopHeaders = getTableHeaders(templates, { handle: 'ticket' } as never, translate)

    expect(desktopHeaders.map((header) => header.key)).toEqual([
      'suppressedMobile',
      'title',
      'summary',
    ])
    expect(getMobileTableHeaders(supportedHeaders).map((header) => header.key)).toEqual([
      'mobileOnly',
      'title',
      'hiddenValue',
    ])
  })

  it('uses explicit mobile visibility instead of deriving it from isValue', () => {
    const headers = [
      createTemplate({ name: 'title', options: ['isValue'], mobileVisible: true }),
      createTemplate({ name: 'description' }),
    ].map((template) => ({
      ...template,
      key: template.name,
      title: template.name,
    }))

    expect(getMobileTableHeaders(headers).map((header) => header.key)).toEqual(['title'])
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
      createTemplate({
        name: 'internalNote',
        formVisible: false,
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

  it('keeps generic reference templates visible despite system metadata', () => {
    const template = createTemplate({
      name: 'reference',
      options: ['isSystem'],
      genericReference: {
        entityField: 'entity',
        handleField: 'reference',
      },
    })

    expect(isGenericReferenceTemplate(template)).toBe(true)
    expect(getTableHeaders([template], { handle: 'document' } as never, (key) => key)).toEqual([
      expect.objectContaining({ key: 'reference', title: 'document.reference' }),
    ])
    expect(getEditDialogHeaders([template], 'edit', true)).toEqual([
      expect.objectContaining({ name: 'reference' }),
    ])
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
      'between',
      'gt',
      'gte',
      'lt',
      'lte',
      'isSet',
      'isEmpty',
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
    ).toEqual({ company: { id: 5 } })

    expect(
      buildTableFilter({
        columnFilters: {
          createdAt: {
            operator: 'between',
            value: '',
            rangeStart: '2026-04-01',
            rangeEnd: '2026-04-02',
            rangeStartOperator: 'gte',
            rangeEndOperator: 'lt',
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
      getEntityValueLabel(item, [
        createTemplate({ name: 'title', options: ['isValue'] }),
        createTemplate({ name: 'startTime', type: 'time', options: ['isValue'] }),
      ]),
    ).toBe('Ticket A 09:30')
  })

  it('prefers isValue fields and falls back to handle for entity labels', () => {
    expect(
      getEntityValueLabel({ handle: 'closed', description: 'Geschlossen' }, [
        createTemplate({ name: 'description', options: ['isValue'] }),
      ]),
    ).toBe('Geschlossen')

    expect(
      getEntityValueLabel({ handle: 'priority' }, [
        createTemplate({ name: 'description', options: ['isValue'] }),
      ]),
    ).toBe('priority')
  })

  it('ignores relation objects in isValue labels and falls back gracefully', () => {
    expect(
      getEntityValueLabel(
        {
          handle: '2026#00015',
          title: 'DATEV Zahlungsverkehrsexport',
          customer: { handle: 'customer-1', title: 'Musterkunde' },
        },
        [
          createTemplate({ name: 'customer', options: ['isValue'] }),
          createTemplate({ name: 'title', options: ['isValue'] }),
        ],
      ),
    ).toBe('DATEV Zahlungsverkehrsexport')

    expect(
      getEntityValueLabel(
        {
          handle: '2026#00015',
          customer: { handle: 'customer-1', title: 'Musterkunde' },
        },
        [createTemplate({ name: 'customer', options: ['isValue'] })],
      ),
    ).toBe('2026#00015')
  })

  it('extracts entity and handle data for generic references', () => {
    const template = createTemplate({
      name: 'reference',
      genericReference: {
        entityField: 'entity',
        handleField: 'reference',
      },
    })

    expect(
      getGenericReferenceEntityHandle(
        {
          entity: { handle: 'ticket' },
          reference: '4711',
        },
        template,
      ),
    ).toBe('ticket')
    expect(
      getGenericReferenceHandle(
        {
          entity: 'company',
          reference: 'abc-123',
        },
        template,
      ),
    ).toBe('abc-123')
  })
})
