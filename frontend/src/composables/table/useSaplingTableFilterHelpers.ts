import type {
  ColumnFilterItem,
  ColumnFilterOperator,
  EntityTemplate,
  SaplingTableHeaderItem,
} from '@/entity/structure'
import type { SaplingGenericItem } from '@/entity/entity'
import type { FilterQuery } from '@/services/api.generic.service'
import {
  getAllowedColumnFilterOperators,
  getDefaultColumnFilterOperatorForTemplate,
  isDateTemplate,
  isManyToOneTemplate,
  isRangeTemplate,
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
        rangeStartOperator: value.rangeStartOperator,
        rangeEndOperator: value.rangeEndOperator,
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
    rangeStartOperator: filter.rangeStartOperator,
    rangeEndOperator: filter.rangeEndOperator,
    relationItems: filter.relationItems?.map((item) => ({ ...item })),
  }
}

export function isEmptyColumnFilterItem(filter: ColumnFilterItem) {
  if (filter.operator === 'isSet' || filter.operator === 'isEmpty') {
    return false
  }

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

export function extractColumnFiltersFromFilterQuery(
  entityTemplates: EntityTemplate[],
  filterQuery: unknown,
) {
  if (!filterQuery || typeof filterQuery !== 'object') {
    return {}
  }

  const restoredFilters = new Map<string, Partial<ColumnFilterItem>>()
  collectRestoredColumnFilters(filterQuery as FilterQuery, entityTemplates, restoredFilters)

  return Object.fromEntries(
    Array.from(restoredFilters.entries()).flatMap(([key, filter]) => {
      const template = getColumnTemplate(entityTemplates, key)
      if (!template) {
        return []
      }

      const normalizedFilter = normalizeRestoredColumnFilter(template, filter)
      return normalizedFilter ? [[key, normalizedFilter]] : []
    }),
  )
}

export function removeRestoredColumnFiltersFromFilterQuery(
  entityTemplates: EntityTemplate[],
  filterQuery: unknown,
): FilterQuery | null {
  if (!filterQuery || typeof filterQuery !== 'object') {
    return null
  }

  return pruneRestoredFilterNode(filterQuery as FilterQuery, entityTemplates)
}

function collectRestoredColumnFilters(
  filterNode: FilterQuery,
  entityTemplates: EntityTemplate[],
  restoredFilters: Map<string, Partial<ColumnFilterItem>>,
) {
  if (tryCollectAndClauses(filterNode, entityTemplates, restoredFilters)) {
    return
  }

  if (tryCollectRelationOrClause(filterNode, entityTemplates, restoredFilters)) {
    return
  }

  for (const [key, value] of Object.entries(filterNode)) {
    if (key.startsWith('$')) {
      continue
    }

    const template = getColumnTemplate(entityTemplates, key)
    if (!template) {
      continue
    }

    const restoredFilter = restoreColumnFilterFromClause(template, value)
    if (!restoredFilter) {
      continue
    }

    mergeRestoredFilter(restoredFilters, key, restoredFilter)
  }
}

function pruneRestoredFilterNode(
  filterNode: FilterQuery,
  entityTemplates: EntityTemplate[],
): FilterQuery | null {
  if (isRestorableRelationOrClause(filterNode, entityTemplates)) {
    return null
  }

  const andClauses = Array.isArray(filterNode.$and)
    ? filterNode.$and
        .map((clause) =>
          clause && typeof clause === 'object'
            ? pruneRestoredFilterNode(clause as FilterQuery, entityTemplates)
            : null,
        )
        .filter((clause): clause is FilterQuery => clause !== null)
    : []

  const remainingFilter: FilterQuery = {}

  Object.entries(filterNode).forEach(([key, value]) => {
    if (key === '$and') {
      return
    }

    if (key.startsWith('$')) {
      remainingFilter[key] = value
      return
    }

    const template = getColumnTemplate(entityTemplates, key)
    if (template && restoreColumnFilterFromClause(template, value)) {
      return
    }

    remainingFilter[key] = value
  })

  if (andClauses.length === 0) {
    return Object.keys(remainingFilter).length > 0 ? remainingFilter : null
  }

  if (Object.keys(remainingFilter).length === 0) {
    if (andClauses.length === 1) {
      return andClauses[0]
    }

    return { $and: andClauses }
  }

  return {
    ...remainingFilter,
    $and: andClauses,
  }
}

function tryCollectAndClauses(
  filterNode: FilterQuery,
  entityTemplates: EntityTemplate[],
  restoredFilters: Map<string, Partial<ColumnFilterItem>>,
) {
  if (!Array.isArray(filterNode.$and)) {
    return false
  }

  filterNode.$and.forEach((clause) => {
    if (clause && typeof clause === 'object') {
      collectRestoredColumnFilters(clause as FilterQuery, entityTemplates, restoredFilters)
    }
  })

  return true
}

function tryCollectRelationOrClause(
  filterNode: FilterQuery,
  entityTemplates: EntityTemplate[],
  restoredFilters: Map<string, Partial<ColumnFilterItem>>,
) {
  if (!Array.isArray(filterNode.$or) || filterNode.$or.length === 0) {
    return false
  }

  let columnKey: string | null = null
  const relationItems: SaplingGenericItem[] = []

  for (const clause of filterNode.$or) {
    if (!clause || typeof clause !== 'object') {
      return false
    }

    const entries = Object.entries(clause as FilterQuery).filter(([key]) => !key.startsWith('$'))
    if (entries.length !== 1) {
      return false
    }

    const [key, value] = entries[0]
    const template = getColumnTemplate(entityTemplates, key)
    if (!template || !isManyToOneTemplate(template)) {
      return false
    }

    const relationItem = createRelationFilterItem(template, value)
    if (!relationItem) {
      return false
    }

    columnKey ??= key
    if (columnKey !== key) {
      return false
    }

    relationItems.push(relationItem)
  }

  if (!columnKey || relationItems.length === 0) {
    return false
  }

  mergeRestoredFilter(restoredFilters, columnKey, {
    operator: 'eq',
    relationItems,
  })

  return true
}

function isRestorableRelationOrClause(filterNode: FilterQuery, entityTemplates: EntityTemplate[]) {
  return tryCollectRelationOrClause(filterNode, entityTemplates, new Map())
}

function restoreColumnFilterFromClause(
  template: EntityTemplate,
  rawValue: unknown,
): Partial<ColumnFilterItem> | null {
  if (isManyToOneTemplate(template)) {
    const relationFilter = restoreRelationFilter(template, rawValue)
    if (relationFilter) {
      return relationFilter
    }
  }

  if (typeof rawValue !== 'object' || rawValue === null || Array.isArray(rawValue)) {
    if (rawValue === null) {
      return {
        operator: 'isEmpty',
      }
    }

    if (
      typeof rawValue === 'string' ||
      typeof rawValue === 'number' ||
      typeof rawValue === 'boolean'
    ) {
      return {
        operator: 'eq',
        value: String(rawValue),
      }
    }

    return null
  }

  const operatorValue = rawValue as Record<string, unknown>

  if (typeof operatorValue.$ilike === 'string') {
    return parseLikeOperatorFilter(operatorValue.$ilike)
  }

  if ('$ne' in operatorValue && operatorValue.$ne === null) {
    return {
      operator: 'isSet',
    }
  }

  if ('$eq' in operatorValue && operatorValue.$eq === null) {
    return {
      operator: 'isEmpty',
    }
  }

  if (isRangeTemplate(template)) {
    const restoredRangeFilter = restoreRangeFilter(template, operatorValue)
    if (restoredRangeFilter) {
      return restoredRangeFilter
    }
  }

  if (Object.keys(operatorValue).length > 1) {
    return null
  }

  const restoredOperators = (['eq', 'gt', 'gte', 'lt', 'lte'] as const)
    .map((operator) => ({
      operator,
      value: operatorValue[`$${operator}`],
    }))
    .filter(
      (entry): entry is { operator: 'eq' | 'gt' | 'gte' | 'lt' | 'lte'; value: string | number | boolean } =>
        typeof entry.value === 'string' ||
        typeof entry.value === 'number' ||
        typeof entry.value === 'boolean',
    )

  if (restoredOperators.length === 1) {
    return {
      operator: restoredOperators[0].operator,
      value: String(restoredOperators[0].value),
    }
  }

  return null
}

function restoreRelationFilter(template: EntityTemplate, rawValue: unknown) {
  if (typeof rawValue !== 'object' || rawValue === null) {
    const relationItem = createRelationFilterItem(template, rawValue)
    return relationItem
      ? {
          operator: 'eq',
          relationItems: [relationItem],
        }
      : null
  }

  if (Array.isArray(rawValue)) {
    return null
  }

  const operatorValue = rawValue as Record<string, unknown>

  if (Array.isArray(operatorValue.$in)) {
    const relationItems = operatorValue.$in
      .map((item) => createRelationFilterItem(template, item))
      .filter((item): item is SaplingGenericItem => item !== null)

    if (relationItems.length > 0) {
      return {
        operator: 'eq',
        relationItems,
      }
    }

    return null
  }

  const nestedIdentifierOperator = restoreRelationIdentifierOperatorFilter(template, operatorValue)
  if (nestedIdentifierOperator) {
    return nestedIdentifierOperator
  }

  if (Object.keys(operatorValue).some((key) => key.startsWith('$'))) {
    return null
  }

  if (!isRoundTrippableRelationIdentifier(template, operatorValue)) {
    return null
  }

  const relationItem = createRelationFilterItem(template, rawValue)
  return relationItem
    ? {
        operator: 'eq',
        relationItems: [relationItem],
      }
    : null
}

function restoreRangeFilter(template: EntityTemplate, operatorValue: Record<string, unknown>) {
  if (isDateTemplate(template)) {
    const restoredDateEquality = restoreDateEqualityFilter(operatorValue)
    if (restoredDateEquality) {
      return restoredDateEquality
    }
  }

  return restoreBetweenFilter(operatorValue)
}

function restoreDateEqualityFilter(operatorValue: Record<string, unknown>) {
  if (typeof operatorValue.$gte !== 'string' || typeof operatorValue.$lt !== 'string') {
    return null
  }

  const start = operatorValue.$gte.trim()
  const endExclusive = operatorValue.$lt.trim()
  if (!isDateOnlyValue(start) || !isDateOnlyValue(endExclusive)) {
    return null
  }

  const nextDay = new Date(`${start}T00:00:00`)
  nextDay.setDate(nextDay.getDate() + 1)

  if (nextDay.toISOString().slice(0, 10) !== endExclusive) {
    return null
  }

  return {
    operator: 'eq',
    value: start,
  }
}

function parseLikeOperatorFilter(value: string): Partial<ColumnFilterItem> {
  const startsWithWildcard = value.startsWith('%')
  const endsWithWildcard = value.endsWith('%')

  if (startsWithWildcard && endsWithWildcard && value.length >= 2) {
    return {
      operator: 'like',
      value: value.slice(1, -1),
    }
  }

  if (endsWithWildcard) {
    return {
      operator: 'startsWith',
      value: value.slice(0, -1),
    }
  }

  if (startsWithWildcard) {
    return {
      operator: 'endsWith',
      value: value.slice(1),
    }
  }

  return {
    operator: 'like',
    value,
  }
}

function createRelationFilterItem(
  template: EntityTemplate,
  rawValue: unknown,
): SaplingGenericItem | null {
  if (isRoundTrippableRelationIdentifier(template, rawValue)) {
    return { ...(rawValue as Record<string, unknown>) }
  }

  if (
    typeof rawValue !== 'string' &&
    typeof rawValue !== 'number' &&
    typeof rawValue !== 'boolean'
  ) {
    return null
  }

  const identifierKey = template.referencedPks?.[0] ?? 'handle'
  return {
    [identifierKey]: rawValue,
  }
}

function restoreRelationIdentifierOperatorFilter(
  template: EntityTemplate,
  operatorValue: Record<string, unknown>,
): Partial<ColumnFilterItem> | null {
  const identifierKeys = template.referencedPks?.length ? template.referencedPks : ['handle', 'id']
  if (identifierKeys.length !== 1) {
    return null
  }

  const identifierKey = identifierKeys[0]
  const nestedValue = operatorValue[identifierKey]

  if (
    typeof nestedValue === 'string' ||
    typeof nestedValue === 'number' ||
    typeof nestedValue === 'boolean'
  ) {
    return {
      operator: 'eq',
      relationItems: [{ [identifierKey]: nestedValue }],
    }
  }

  if (typeof nestedValue !== 'object' || nestedValue === null || Array.isArray(nestedValue)) {
    return null
  }

  const nestedOperatorValue = nestedValue as Record<string, unknown>

  if (Array.isArray(nestedOperatorValue.$in)) {
    return {
      operator: 'eq',
      relationItems: nestedOperatorValue.$in
        .filter(isScalarFilterValue)
        .map((value) => ({ [identifierKey]: value })),
    }
  }

  if (Array.isArray(nestedOperatorValue.$nin)) {
    return {
      operator: 'nin',
      relationItems: nestedOperatorValue.$nin
        .filter(isScalarFilterValue)
        .map((value) => ({ [identifierKey]: value })),
    }
  }

  return null
}

function restoreBetweenFilter(operatorValue: Record<string, unknown>): Partial<ColumnFilterItem> | null {
  const rangeStart = parseComparableRangeValue(operatorValue.$gt ?? operatorValue.$gte)
  const rangeEnd = parseComparableRangeValue(operatorValue.$lt ?? operatorValue.$lte)
  const rangeStartOperator = typeof operatorValue.$gt !== 'undefined' ? 'gt' : typeof operatorValue.$gte !== 'undefined' ? 'gte' : undefined
  const rangeEndOperator = typeof operatorValue.$lt !== 'undefined' ? 'lt' : typeof operatorValue.$lte !== 'undefined' ? 'lte' : undefined

  if (!rangeStartOperator && !rangeEndOperator) {
    return null
  }

  if (rangeStartOperator && rangeEndOperator) {
    return {
      operator: 'between',
      rangeStart,
      rangeEnd,
      rangeStartOperator,
      rangeEndOperator,
    }
  }

  if (rangeStart && rangeStartOperator) {
    return {
      operator: rangeStartOperator,
      value: rangeStart,
    }
  }

  if (rangeEnd && rangeEndOperator) {
    return {
      operator: rangeEndOperator,
      value: rangeEnd,
    }
  }

  return null
}

function isRoundTrippableRelationIdentifier(template: EntityTemplate, rawValue: unknown) {
  if (typeof rawValue !== 'object' || rawValue === null || Array.isArray(rawValue)) {
    return false
  }

  const identifier = rawValue as Record<string, unknown>
  if (Object.keys(identifier).some((key) => key.startsWith('$'))) {
    return false
  }

  const identifierKeys = template.referencedPks?.length
    ? template.referencedPks
    : ['handle', 'id'].filter((key) => key in identifier)

  if (identifierKeys.length === 0) {
    return false
  }

  return identifierKeys.every((key) => isScalarFilterValue(identifier[key]))
}

function isScalarFilterValue(value: unknown): value is string | number | boolean {
  return (
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
  )
}

function mergeRestoredFilter(
  restoredFilters: Map<string, Partial<ColumnFilterItem>>,
  key: string,
  nextFilter: Partial<ColumnFilterItem>,
) {
  const existingFilter = restoredFilters.get(key) ?? {}

  restoredFilters.set(key, {
    ...existingFilter,
    ...nextFilter,
    relationItems: mergeRelationItems(existingFilter.relationItems, nextFilter.relationItems),
  })
}

function mergeRelationItems(
  existingItems?: SaplingGenericItem[],
  nextItems?: SaplingGenericItem[],
): SaplingGenericItem[] | undefined {
  const mergedItems = [...(existingItems ?? []), ...(nextItems ?? [])]
  if (mergedItems.length === 0) {
    return undefined
  }

  const seenItems = new Set<string>()
  return mergedItems.filter((item) => {
    const itemKey = JSON.stringify(item)
    if (seenItems.has(itemKey)) {
      return false
    }

    seenItems.add(itemKey)
    return true
  })
}

function normalizeRestoredColumnFilter(
  template: EntityTemplate,
  filter: Partial<ColumnFilterItem>,
): ColumnFilterItem | null {
  const normalizedFilter: ColumnFilterItem = {
    operator: getDefaultColumnFilterOperatorForTemplate(template),
    value: '',
  }

  if (filter.operator && getAllowedColumnFilterOperators(template).includes(filter.operator)) {
    normalizedFilter.operator = filter.operator
  }

  if (filter.relationItems?.length) {
    normalizedFilter.relationItems = filter.relationItems.map((item) => ({ ...item }))
    normalizedFilter.value = ''
  } else if (filter.rangeStart || filter.rangeEnd) {
    normalizedFilter.rangeStart = filter.rangeStart?.trim() || undefined
    normalizedFilter.rangeEnd = filter.rangeEnd?.trim() || undefined
    normalizedFilter.rangeStartOperator = filter.rangeStartOperator
    normalizedFilter.rangeEndOperator = filter.rangeEndOperator
    normalizedFilter.value = ''
  } else if (typeof filter.value === 'string') {
    normalizedFilter.value = filter.value.trim()
  }

  if (isEmptyColumnFilterItem(normalizedFilter)) {
    return null
  }

  return normalizedFilter
}

function isDateOnlyValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function parseComparableRangeValue(value: unknown) {
  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    typeof value !== 'boolean'
  ) {
    return undefined
  }

  return String(value).trim() || undefined
}
