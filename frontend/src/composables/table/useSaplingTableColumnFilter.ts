import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import type { ColumnFilterItem, ColumnFilterOperator, EntityTemplate } from '@/entity/structure'
import { normalizeTableColumnTemplate, type TableColumnLike } from './useSaplingTableFilterHelpers'
import { useGenericStore } from '@/stores/genericStore'
import { getEntityValueLabel } from '@/utils/saplingTableUtil'
import {
  isBooleanTemplate,
  isDateTemplate,
  isManyToOneTemplate,
  isNumericTemplate,
  isRangeTemplate,
  isTimeTemplate,
} from '@/utils/saplingTableUtil'

type InputKind =
  | 'boolean'
  | 'color'
  | 'icon'
  | 'money'
  | 'percent'
  | 'phone'
  | 'mail'
  | 'link'
  | 'date'
  | 'datetime'
  | 'time'
  | 'number'
  | 'text'

type FilterVariant = 'boolean' | 'icon' | 'relation' | 'range' | 'single'

export interface SaplingTableColumnFilterProps {
  column: TableColumnLike
  filterItem?: ColumnFilterItem | null
  title: string
  operatorOptions: Array<{ label: string; value: ColumnFilterOperator }>
  sortIcon: unknown
  loading?: boolean
}

type SaplingTableColumnFilterEmit = {
  (event: 'update:filter', value: ColumnFilterItem | null): void
}

const TABLE_FILTER_INPUT_DEBOUNCE_MS = 250

export function useSaplingTableColumnFilter(
  props: SaplingTableColumnFilterProps,
  emit: SaplingTableColumnFilterEmit,
) {
  const { t } = useI18n()
  const { isLoading: isTranslationLoading } = useTranslationLoader('filter')
  const genericStore = useGenericStore()
  const isComponentLoading = computed(() => isTranslationLoading.value || props.loading === true)
  const menuOpen = ref(false)
  let filterEmitTimeout: ReturnType<typeof setTimeout> | null = null

  const normalizedColumn = computed<Partial<EntityTemplate>>(
    () => normalizeTableColumnTemplate(props.column) ?? {},
  )
  const columnOptions = computed(() => normalizedColumn.value.options ?? [])

  const inputKind = computed<InputKind>(() => {
    const columnType = String(normalizedColumn.value.type ?? '').toLowerCase()

    if (isBooleanTemplate(normalizedColumn.value)) return 'boolean'
    if (columnOptions.value.includes('isColor')) return 'color'
    if (columnOptions.value.includes('isIcon')) return 'icon'
    if (columnOptions.value.includes('isMoney')) return 'money'
    if (columnOptions.value.includes('isPercent')) return 'percent'
    if (columnOptions.value.includes('isPhone')) return 'phone'
    if (columnOptions.value.includes('isMail')) return 'mail'
    if (columnOptions.value.includes('isLink')) return 'link'
    if (columnType === 'datetime') return 'datetime'
    if (isDateTemplate(normalizedColumn.value)) return 'date'
    if (isTimeTemplate(normalizedColumn.value)) return 'time'
    if (isNumericTemplate(normalizedColumn.value)) return 'number'

    return 'text'
  })

  const filterVariant = computed<FilterVariant>(() => {
    if (inputKind.value === 'boolean') {
      return 'boolean'
    }

    if (inputKind.value === 'icon') {
      return 'icon'
    }

    if (isManyToOneTemplate(normalizedColumn.value)) {
      return 'relation'
    }

    if (isRangeTemplate(normalizedColumn.value)) {
      return 'range'
    }

    return 'single'
  })

  const defaultOperator = computed<ColumnFilterOperator>(
    () => props.operatorOptions[0]?.value ?? 'eq',
  )

  const localFilter = ref<ColumnFilterItem>(
    createFilterState(props.filterItem, defaultOperator.value),
  )

  watch(
    [() => props.filterItem, defaultOperator],
    ([filterItem, fallbackOperator]) => {
      cancelPendingFilterEmit()

      if (filterItem) {
        localFilter.value = createFilterState(filterItem, fallbackOperator)
        return
      }

      localFilter.value = createEmptyFilterState(
        isAllowedOperator(props.operatorOptions, localFilter.value.operator)
          ? localFilter.value.operator
          : fallbackOperator,
      )
    },
    { deep: true, immediate: true },
  )

  onBeforeUnmount(() => {
    cancelPendingFilterEmit()
  })

  const activeFilter = computed<ColumnFilterItem>(() => localFilter.value)
  const singleValue = computed(() => activeFilter.value.value)
  const rangeStartValue = computed(() => activeFilter.value.rangeStart ?? '')
  const rangeEndValue = computed(() => activeFilter.value.rangeEnd ?? '')
  const relationItems = computed(() => activeFilter.value.relationItems ?? [])
  const referenceEntityHandle = computed(() => normalizedColumn.value.referenceName ?? '')
  const referenceTemplates = computed(() => {
    if (!referenceEntityHandle.value) {
      return []
    }

    return genericStore.getState(referenceEntityHandle.value).entityTemplates
  })

  const hasValue = computed(() => {
    return (
      singleValue.value.trim().length > 0 ||
      rangeStartValue.value.trim().length > 0 ||
      rangeEndValue.value.trim().length > 0 ||
      relationItems.value.length > 0
    )
  })

  const currentOperator = computed(() => {
    return (
      props.operatorOptions.find((option) => option.value === activeFilter.value.operator)?.value ??
      props.operatorOptions[0]?.value ??
      'eq'
    )
  })

  const currentOperatorLabel = computed(() => {
    return (
      props.operatorOptions.find((option) => option.value === currentOperator.value)?.label ?? '='
    )
  })

  const isOperatorSelectable = computed(
    () => props.operatorOptions.length > 1 && filterVariant.value === 'single',
  )

  const operatorItems = computed(() =>
    props.operatorOptions.map((option) => ({
      title: getOperatorDescription(option.value, t),
      value: option.value,
      symbol: option.label,
    })),
  )

  const inputType = computed(() => {
    switch (inputKind.value) {
      case 'color':
        return 'color'
      case 'mail':
        return 'email'
      case 'phone':
        return 'tel'
      case 'link':
        return 'url'
      case 'date':
        return 'date'
      case 'datetime':
        return 'datetime-local'
      case 'time':
        return 'time'
      case 'number':
      case 'money':
      case 'percent':
        return 'number'
      default:
        return 'text'
    }
  })

  const singleValueLabel = computed(() => {
    switch (inputKind.value) {
      case 'color':
        return t('filter.color')
      default:
        return t('filter.value')
    }
  })

  const rangeStartPlaceholder = computed(() => {
    if (['number', 'money', 'percent'].includes(inputKind.value)) {
      return t('filter.minimum')
    }

    return t('filter.start')
  })

  const rangeEndPlaceholder = computed(() => {
    if (['number', 'money', 'percent'].includes(inputKind.value)) {
      return t('filter.maximum')
    }

    return t('filter.end')
  })

  const inputPrefix = computed(() => (inputKind.value === 'money' ? 'EUR' : undefined))
  const inputSuffix = computed(() => (inputKind.value === 'percent' ? '%' : undefined))
  const inputStep = computed(() =>
    ['number', 'money', 'percent'].includes(inputKind.value) ? 'any' : undefined,
  )
  const isClearableField = computed(
    () => !['color', 'date', 'datetime', 'time'].includes(inputKind.value),
  )

  const filterSummary = computed(() => {
    if (!hasValue.value) {
      return t('filter.noFilter')
    }

    if (filterVariant.value === 'range') {
      if (rangeStartValue.value && rangeEndValue.value) {
        return `${rangeStartValue.value} ${t('filter.to').toLowerCase()} ${rangeEndValue.value}`
      }

      if (rangeStartValue.value) {
        return `${t('filter.from').toLowerCase()} ${rangeStartValue.value}`
      }

      if (rangeEndValue.value) {
        return `${t('filter.to').toLowerCase()} ${rangeEndValue.value}`
      }
    }

    if (filterVariant.value === 'relation') {
      if (relationItems.value.length === 1) {
        return getEntityValueLabel(relationItems.value[0], referenceTemplates.value)
      }

      return t('filter.selectedCount', { count: relationItems.value.length })
    }

    if (filterVariant.value === 'boolean') {
      return singleValue.value === 'true' ? t('filter.yes') : t('filter.no')
    }

    return singleValue.value
  })

  function updateOperator(value: ColumnFilterOperator | null) {
    if (!value) {
      return
    }

    emitFilter({ operator: value }, { debounce: false })
  }

  function updateSingleValue(value: string) {
    emitFilter({ value }, { debounce: true })
  }

  function updateRangeStart(value: string) {
    emitFilter({ rangeStart: value }, { debounce: true })
  }

  function updateRangeEnd(value: string) {
    emitFilter({ rangeEnd: value }, { debounce: true })
  }

  function updateRelationItems(value: ColumnFilterItem['relationItems']) {
    emitFilter({ relationItems: value?.map((item) => ({ ...item })) ?? [] }, { debounce: false })
  }

  function clearFilter() {
    cancelPendingFilterEmit()
    localFilter.value = createEmptyFilterState(defaultOperator.value)
    emit('update:filter', null)
    menuOpen.value = false
  }

  function emitFilter(patch: Partial<ColumnFilterItem>, { debounce }: { debounce: boolean }) {
    const nextFilter: ColumnFilterItem = {
      operator: currentOperator.value,
      value: singleValue.value,
      rangeStart: rangeStartValue.value,
      rangeEnd: rangeEndValue.value,
      relationItems: relationItems.value.map((item) => ({ ...item })),
      ...patch,
    }

    if (filterVariant.value === 'relation') {
      nextFilter.value = ''
      nextFilter.rangeStart = undefined
      nextFilter.rangeEnd = undefined
    } else if (filterVariant.value === 'range') {
      nextFilter.value = ''
      nextFilter.relationItems = undefined
    } else {
      nextFilter.rangeStart = undefined
      nextFilter.rangeEnd = undefined
      nextFilter.relationItems = undefined
      nextFilter.value = nextFilter.value.trim()
    }

    nextFilter.operator = props.operatorOptions.some(
      (option) => option.value === nextFilter.operator,
    )
      ? nextFilter.operator
      : defaultOperator.value

    nextFilter.rangeStart = nextFilter.rangeStart?.trim() || undefined
    nextFilter.rangeEnd = nextFilter.rangeEnd?.trim() || undefined
    nextFilter.relationItems = nextFilter.relationItems?.length
      ? nextFilter.relationItems.map((item) => ({ ...item }))
      : undefined

    const isEmpty =
      nextFilter.value.length === 0 &&
      (nextFilter.rangeStart?.length ?? 0) === 0 &&
      (nextFilter.rangeEnd?.length ?? 0) === 0 &&
      (nextFilter.relationItems?.length ?? 0) === 0

    localFilter.value = isEmpty
      ? createEmptyFilterState(nextFilter.operator)
      : createFilterState(nextFilter, defaultOperator.value)

    if (!debounce) {
      cancelPendingFilterEmit()
      emit('update:filter', isEmpty ? null : nextFilter)
      return
    }

    cancelPendingFilterEmit()
    filterEmitTimeout = setTimeout(() => {
      filterEmitTimeout = null
      emit('update:filter', isEmpty ? null : nextFilter)
    }, TABLE_FILTER_INPUT_DEBOUNCE_MS)
  }

  function cancelPendingFilterEmit() {
    if (filterEmitTimeout) {
      clearTimeout(filterEmitTimeout)
      filterEmitTimeout = null
    }
  }

  return {
    clearFilter,
    currentOperator,
    currentOperatorLabel,
    filterSummary,
    filterVariant,
    hasValue,
    inputPrefix,
    inputStep,
    inputSuffix,
    inputType,
    isClearableField,
    isComponentLoading,
    isOperatorSelectable,
    menuOpen,
    operatorItems,
    rangeEndPlaceholder,
    rangeEndValue,
    rangeStartPlaceholder,
    rangeStartValue,
    referenceEntityHandle,
    relationItems,
    singleValue,
    singleValueLabel,
    updateOperator,
    updateRangeEnd,
    updateRangeStart,
    updateRelationItems,
    updateSingleValue,
  }
}

function createFilterState(
  filterItem: ColumnFilterItem | null | undefined,
  fallbackOperator: ColumnFilterOperator,
): ColumnFilterItem {
  return {
    operator: filterItem?.operator ?? fallbackOperator,
    value: filterItem?.value ?? '',
    rangeStart: filterItem?.rangeStart ?? '',
    rangeEnd: filterItem?.rangeEnd ?? '',
    relationItems: filterItem?.relationItems?.map((item) => ({ ...item })) ?? [],
  }
}

function createEmptyFilterState(operator: ColumnFilterOperator): ColumnFilterItem {
  return {
    operator,
    value: '',
    rangeStart: '',
    rangeEnd: '',
    relationItems: [],
  }
}

function getOperatorDescription(
  operator: ColumnFilterOperator,
  t: (key: string, values?: Record<string, unknown>) => string,
) {
  switch (operator) {
    case 'like':
      return t('filter.contains')
    case 'startsWith':
      return t('filter.startsWith')
    case 'endsWith':
      return t('filter.endsWith')
    case 'eq':
      return t('filter.isEqual')
    case 'gt':
      return t('filter.isGreaterThan')
    case 'gte':
      return t('filter.isGreaterThanOrEqualTo')
    case 'lt':
      return t('filter.isLessThan')
    case 'lte':
      return t('filter.isLessThanOrEqualTo')
    default:
      return operator
  }
}

function isAllowedOperator(
  operatorOptions: Array<{ label: string; value: ColumnFilterOperator }>,
  operator: ColumnFilterOperator,
) {
  return operatorOptions.some((option) => option.value === operator)
}
