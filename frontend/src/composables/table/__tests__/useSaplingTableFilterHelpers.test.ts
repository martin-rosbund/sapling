import { describe, expect, it } from 'vitest'
import type { ColumnFilterItem, EntityTemplate } from '@/entity/structure'
import {
  cloneColumnFilters,
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
})

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
    isReference: false,
    referencedPks: [],
    referenceName: undefined,
    length: undefined,
  } as EntityTemplate
}
