import type {
  ColumnFilterItem,
  ColumnFilterOperator,
  EntityTemplate,
  SaplingTableHeaderItem,
} from '@/entity/structure'
import {
  getAllowedColumnFilterOperators,
  getDefaultColumnFilterOperatorForTemplate,
} from '@/utils/saplingTableUtil'

export type TableColumnLike = Record<string, unknown> & {
  key: string | null
  title?: string | null
  name?: string | null
  type?: string | null
  kind?: string | null
  referenceName?: string | null
  referencedPks?: unknown
  length?: number | null
  options?: unknown
  isReference?: boolean | null
}

export function cloneColumnFilters(filters?: Record<string, ColumnFilterItem>) {
  if (!filters) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(filters).map(([key, value]) => [
      key,
      {
        ...value,
        relationItems: value.relationItems?.map((item) => ({ ...item })),
      },
    ]),
  )
}

export function normalizeColumnFilterItem(
  entityTemplates: EntityTemplate[],
  key: string,
  filter: ColumnFilterItem,
): ColumnFilterItem {
  return {
    operator: getNormalizedColumnFilterOperator(entityTemplates, key, filter.operator),
    value: filter.value.trim(),
    rangeStart: filter.rangeStart?.trim() || undefined,
    rangeEnd: filter.rangeEnd?.trim() || undefined,
    relationItems: filter.relationItems?.map((item) => ({ ...item })),
  }
}

export function isEmptyColumnFilterItem(filter: ColumnFilterItem) {
  return (
    filter.value.length === 0 &&
    (filter.rangeStart?.length ?? 0) === 0 &&
    (filter.rangeEnd?.length ?? 0) === 0 &&
    (filter.relationItems?.length ?? 0) === 0
  )
}

export function normalizeTableColumnTemplate(
  column?: TableColumnLike | SaplingTableHeaderItem | Partial<EntityTemplate>,
) {
  if (!column) {
    return undefined
  }

  return {
    key: ('key' in column ? column.key : undefined) ?? undefined,
    name: typeof column.name === 'string' ? column.name : undefined,
    type: typeof column.type === 'string' ? column.type : undefined,
    kind: typeof column.kind === 'string' ? column.kind : undefined,
    referenceName: typeof column.referenceName === 'string' ? column.referenceName : undefined,
    referencedPks: Array.isArray(column.referencedPks)
      ? column.referencedPks.filter((key): key is string => typeof key === 'string')
      : undefined,
    length: typeof column.length === 'number' ? column.length : undefined,
    options: Array.isArray(column.options)
      ? (column.options.filter(
          (option): option is string => typeof option === 'string',
        ) as EntityTemplate['options'])
      : undefined,
    isReference: column.isReference === true,
  }
}

function getNormalizedColumnFilterOperator(
  entityTemplates: EntityTemplate[],
  key: string,
  operator: ColumnFilterOperator,
) {
  const template = getColumnTemplate(entityTemplates, key)
  const allowedOperators = getAllowedColumnFilterOperators(template)
  return allowedOperators.includes(operator)
    ? operator
    : getDefaultColumnFilterOperatorForTemplate(template)
}

function getColumnTemplate(entityTemplates: EntityTemplate[], key: string) {
  return entityTemplates.find((item) => item.name === key || item.key === key)
}
