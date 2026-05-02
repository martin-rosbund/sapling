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
  cloneColumnFilters,
  isEmptyColumnFilterItem,
  normalizeColumnFilterItem,
  normalizeTableColumnTemplate,
  type TableColumnLike,
} from '@/composables/table/useSaplingTableFilterHelpers'
import { getAllowedColumnFilterOperators, isFilterableTableColumn } from '@/utils/saplingTableUtil'

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
      getAllowedColumnFilterOperators(normalizeTableColumnTemplate(column)).includes(option.value),
    )
  }

  function isColumnFilterable(column: TableColumnLike | SaplingTableHeaderItem) {
    const normalizedColumn = normalizeTableColumnTemplate(column)
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
