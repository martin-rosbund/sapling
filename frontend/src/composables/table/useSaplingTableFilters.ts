import { ref, watch } from 'vue'
import type {
  ColumnFilterItem,
  ColumnFilterOperator,
  EntityTemplate,
  SaplingTableHeaderItem,
  SortItem,
} from '@/entity/structure'
import { DEFAULT_ENTITY_ITEMS_COUNT } from '@/constants/project.constants'
import {
  getAllowedColumnFilterOperators,
  getDefaultColumnFilterOperatorForTemplate,
  isFilterableTableColumn,
} from '@/utils/saplingTableUtil'

type TableColumnLike = Record<string, unknown> & {
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

interface UseSaplingTableFiltersProps {
  sortBy: SortItem[]
  entityTemplates: EntityTemplate[]
  columnFilters?: Record<string, ColumnFilterItem>
}

type UseSaplingTableFiltersEmit = {
  (event: 'update:search', value: string): void
  (event: 'update:page', value: number): void
  (event: 'update:itemsPerPage', value: number): void
  (event: 'update:sortBy', value: SortItem[]): void
  (event: 'update:columnFilters', value: Record<string, ColumnFilterItem>): void
}

const FILTER_OPERATOR_OPTIONS: Array<{ label: string; value: ColumnFilterOperator }> = [
  { label: '~', value: 'like' },
  { label: 'a*', value: 'startsWith' },
  { label: '*a', value: 'endsWith' },
  { label: '=', value: 'eq' },
  { label: '>', value: 'gt' },
  { label: '>=', value: 'gte' },
  { label: '<', value: 'lt' },
  { label: '<=', value: 'lte' },
]

export function useSaplingTableFilters(
  props: UseSaplingTableFiltersProps,
  emit: UseSaplingTableFiltersEmit,
) {
  const localColumnFilters = ref<Record<string, ColumnFilterItem>>(
    cloneColumnFilters(props.columnFilters),
  )

  watch(
    () => props.columnFilters,
    (value) => {
      localColumnFilters.value = cloneColumnFilters(value)
    },
  )

  function onSearchUpdate(value: string) {
    emit('update:search', value)
  }

  function onPageUpdate(value: number) {
    emit('update:page', value)
  }

  function onItemsPerPageUpdate(value: number | string) {
    const limit = value === -1 ? DEFAULT_ENTITY_ITEMS_COUNT : Number(value)
    emit('update:itemsPerPage', limit)
  }

  function onSortByUpdate(value: SortItem[]) {
    const filteredSort = value.filter((item) => item.key !== '__actions')
    if (filteredSort.length !== value.length) {
      return
    }

    emit('update:sortBy', filteredSort)
  }

  function toggleColumnSort(key: string) {
    if (!key || key === '__actions' || key === '__select') {
      return
    }

    const currentSort = props.sortBy.find((item) => item.key === key)
    if (!currentSort) {
      emit('update:sortBy', [{ key, order: 'asc' }])
      return
    }

    if (currentSort.order === 'asc') {
      emit('update:sortBy', [{ key, order: 'desc' }])
      return
    }

    emit('update:sortBy', [])
  }

  function getColumnSortIcon(key: string) {
    const currentSort = props.sortBy.find((item) => item.key === key)
    if (currentSort?.order === 'asc') {
      return 'mdi-arrow-up'
    }

    if (currentSort?.order === 'desc') {
      return 'mdi-arrow-down'
    }

    return 'mdi-swap-vertical'
  }

  function onColumnFilterChange(key: string, filter: ColumnFilterItem | null) {
    const nextFilters = { ...localColumnFilters.value }

    if (!filter) {
      delete nextFilters[key]
      localColumnFilters.value = nextFilters
      emit('update:columnFilters', nextFilters)
      return
    }

    const normalizedFilter = normalizeColumnFilterItem(props.entityTemplates, key, filter)
    if (isEmptyColumnFilterItem(normalizedFilter)) {
      delete nextFilters[key]
    } else {
      nextFilters[key] = normalizedFilter
    }

    localColumnFilters.value = nextFilters
    emit('update:columnFilters', nextFilters)
  }

  function getColumnFilterItem(key: string) {
    const filter = localColumnFilters.value[key]
    if (!filter) {
      return undefined
    }

    return {
      ...filter,
      relationItems: filter.relationItems?.map((item) => ({ ...item })),
    }
  }

  function getFilterOperatorOptions(column: TableColumnLike | SaplingTableHeaderItem) {
    return FILTER_OPERATOR_OPTIONS.filter((option) =>
      getAllowedColumnFilterOperators(normalizeColumnTemplate(column)).includes(option.value),
    )
  }

  function isColumnFilterable(column: TableColumnLike | SaplingTableHeaderItem) {
    const normalizedColumn = normalizeColumnTemplate(column)
    return normalizedColumn ? isFilterableTableColumn(normalizedColumn) : false
  }

  return {
    localColumnFilters,
    onSearchUpdate,
    onPageUpdate,
    onItemsPerPageUpdate,
    onSortByUpdate,
    toggleColumnSort,
    getColumnSortIcon,
    onColumnFilterChange,
    getColumnFilterItem,
    getFilterOperatorOptions,
    isColumnFilterable,
  }
}

function cloneColumnFilters(filters?: Record<string, ColumnFilterItem>) {
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

function normalizeColumnFilterItem(
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

function isEmptyColumnFilterItem(filter: ColumnFilterItem) {
  return (
    filter.value.length === 0 &&
    (filter.rangeStart?.length ?? 0) === 0 &&
    (filter.rangeEnd?.length ?? 0) === 0 &&
    (filter.relationItems?.length ?? 0) === 0
  )
}

function getColumnTemplate(entityTemplates: EntityTemplate[], key: string) {
  return entityTemplates.find((item) => item.name === key || item.key === key)
}

function normalizeColumnTemplate(column?: TableColumnLike | Partial<EntityTemplate>) {
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
