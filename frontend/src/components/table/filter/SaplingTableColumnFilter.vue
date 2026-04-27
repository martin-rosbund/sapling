<template>
  <div class="sapling-table-filter-cell" @click.stop @mousedown.stop @keydown.stop>
    <v-menu v-model="menuOpen" :close-on-content-click="false" location="bottom start" offset="6">
      <template #activator="{ props: menuProps }">
        <button
          v-bind="menuProps"
          class="sapling-table-filter-trigger"
          :class="{ 'sapling-table-filter-trigger--active': hasValue }"
          type="button"
          @click.stop
        >
          <span class="sapling-table-filter-trigger__title">
            <v-icon size="x-small">{{ hasValue ? 'mdi-filter' : 'mdi-filter-outline' }}</v-icon>
            <span v-if="!isComponentLoading">{{ title }}</span>
            <v-skeleton-loader
              v-else
              class="sapling-table-filter-trigger__title-skeleton"
              type="text"
            />
          </span>
          <span
            v-if="isComponentLoading"
            class="sapling-table-filter-trigger__placeholder sapling-table-filter-trigger__placeholder--loading"
          >
            <v-skeleton-loader class="sapling-table-filter-trigger__skeleton" type="text" />
          </span>
          <span v-else-if="hasValue" class="sapling-table-filter-trigger__summary">
            <span v-if="isOperatorSelectable" class="sapling-table-filter-trigger__operator">
              {{ currentOperatorLabel }}
            </span>
            <span class="sapling-table-filter-trigger__value">{{ filterSummary }}</span>
          </span>
          <span v-else class="sapling-table-filter-trigger__placeholder">
            {{ $t(`filter.noFilter`) }}
          </span>
        </button>
      </template>

      <v-card class="sapling-table-filter-menu glass-panel" elevation="10">
        <div v-if="isComponentLoading" class="sapling-table-filter-menu__loading">
          <v-skeleton-loader type="heading, text" />
          <v-skeleton-loader type="article" />
          <v-skeleton-loader type="button, button" />
        </div>
        <template v-else>
          <div class="sapling-table-filter-menu__header">
            <div>
              <div class="sapling-table-filter-menu__eyebrow">{{ $t('filter.filter') }}</div>
              <div class="sapling-table-filter-menu__title">{{ title }}</div>
            </div>
            <v-btn icon variant="text" size="small" @click.stop="clearFilter">
              <v-icon size="small">mdi-filter-off-outline</v-icon>
            </v-btn>
          </div>

          <v-select
            v-if="isOperatorSelectable"
            :model-value="currentOperator"
            :items="operatorItems"
            item-title="title"
            item-value="value"
            :label="$t('filter.operator')"
            density="comfortable"
            variant="outlined"
            hide-details
            class="sapling-table-filter-menu__field"
            @update:model-value="updateOperator"
          >
            <template #item="{ item, props: itemProps }">
              <v-list-item v-bind="itemProps" :title="item.title" :subtitle="item.symbol" />
            </template>
          </v-select>

          <SaplingTableFilterBooleanValue
            v-if="filterVariant === 'boolean'"
            :model-value="singleValue"
            @update:model-value="updateSingleValue"
          />

          <SaplingTableFilterIconValue
            v-else-if="filterVariant === 'icon'"
            :model-value="singleValue"
            @update:model-value="updateSingleValue"
          />

          <SaplingTableFilterRelationValue
            v-else-if="filterVariant === 'relation'"
            :entity-handle="referenceEntityHandle"
            :model-value="relationItems"
            @update:model-value="updateRelationItems"
          />

          <SaplingTableFilterRangeValue
            v-else-if="filterVariant === 'range'"
            :start-value="rangeStartValue"
            :end-value="rangeEndValue"
            :input-type="inputType"
            :start-placeholder="rangeStartPlaceholder"
            :end-placeholder="rangeEndPlaceholder"
            :prefix="inputPrefix"
            :suffix="inputSuffix"
            :step="inputStep"
            @update:start-value="updateRangeStart"
            @update:end-value="updateRangeEnd"
          />

          <SaplingTableFilterSingleValue
            v-else
            :model-value="singleValue"
            :input-type="inputType"
            :label="singleValueLabel"
            :prefix="inputPrefix"
            :suffix="inputSuffix"
            :step="inputStep"
            :clearable="isClearableField"
            @update:model-value="updateSingleValue"
          />

          <div class="sapling-table-filter-menu__footer">
            <v-btn variant="text" size="small" @click.stop="clearFilter">
              {{ $t(`filter.reset`) }}
            </v-btn>
            <v-btn variant="text" size="small" @click.stop="emit('sort')">
              {{ $t(`filter.sort`) }}
            </v-btn>
          </div>
        </template>
      </v-card>
    </v-menu>

    <v-btn
      icon
      variant="text"
      size="x-small"
      class="sapling-table-filter-sort"
      @click.stop="emit('sort')"
    >
      <v-icon size="small">{{ sortIcon }}</v-icon>
    </v-btn>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import type { ColumnFilterItem, ColumnFilterOperator, EntityTemplate } from '@/entity/structure'
import {
  isBooleanTemplate,
  isDateTemplate,
  isManyToOneTemplate,
  isNumericTemplate,
  isRangeTemplate,
  isTimeTemplate,
} from '@/utils/saplingTableUtil'
import SaplingTableFilterBooleanValue from './SaplingTableFilterBooleanValue.vue'
import SaplingTableFilterIconValue from './SaplingTableFilterIconValue.vue'
import SaplingTableFilterRelationValue from './SaplingTableFilterRelationValue.vue'
import SaplingTableFilterRangeValue from './SaplingTableFilterRangeValue.vue'
import SaplingTableFilterSingleValue from './SaplingTableFilterSingleValue.vue'

type TableColumnLike = Record<string, unknown> & { key: string | null }
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
const TABLE_FILTER_INPUT_DEBOUNCE_MS = 250

interface SaplingTableColumnFilterProps {
  column: TableColumnLike
  filterItem?: ColumnFilterItem | null
  title: string
  operatorOptions: Array<{ label: string; value: ColumnFilterOperator }>
  sortIcon: unknown
  loading?: boolean
}

const props = defineProps<SaplingTableColumnFilterProps>()

const emit = defineEmits<{
  'update:filter': [value: ColumnFilterItem | null]
  sort: []
}>()

const { t } = useI18n()
const { isLoading: isTranslationLoading } = useTranslationLoader('filter')
const isComponentLoading = computed(() => isTranslationLoading.value || props.loading === true)
const menuOpen = ref(false)
let filterEmitTimeout: ReturnType<typeof setTimeout> | null = null

const normalizedColumn = computed<Partial<EntityTemplate>>(() => ({
  key: typeof props.column.key === 'string' ? props.column.key : undefined,
  name: typeof props.column.name === 'string' ? props.column.name : undefined,
  type: typeof props.column.type === 'string' ? props.column.type : undefined,
  kind: typeof props.column.kind === 'string' ? props.column.kind : undefined,
  referenceName:
    typeof props.column.referenceName === 'string' ? props.column.referenceName : undefined,
  referencedPks: Array.isArray(props.column.referencedPks)
    ? props.column.referencedPks.filter((key): key is string => typeof key === 'string')
    : undefined,
  isReference: props.column.isReference === true,
  options: Array.isArray(props.column.options)
    ? (props.column.options.filter(
        (option): option is string => typeof option === 'string',
      ) as EntityTemplate['options'])
    : undefined,
}))

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
      isAllowedOperator(localFilter.value.operator) ? localFilter.value.operator : fallbackOperator,
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
    title: getOperatorDescription(option.value),
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
      return getRelationLabel(relationItems.value[0])
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
  emitFilter(
    { relationItems: value?.map((item) => ({ ...item })) ?? [] },
    { debounce: false },
  )
}

function clearFilter() {
  cancelPendingFilterEmit()
  localFilter.value = createEmptyFilterState(defaultOperator.value)
  emit('update:filter', null)
  menuOpen.value = false
}

function emitFilter(
  patch: Partial<ColumnFilterItem>,
  { debounce }: { debounce: boolean },
) {
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

  nextFilter.operator = props.operatorOptions.some((option) => option.value === nextFilter.operator)
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

function isAllowedOperator(operator: ColumnFilterOperator) {
  return props.operatorOptions.some((option) => option.value === operator)
}

function getOperatorDescription(operator: ColumnFilterOperator) {
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

function getRelationLabel(item: Record<string, unknown>) {
  for (const key of ['name', 'title', 'label', 'handle', 'id']) {
    const value = item[key]
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }
  }

  return t('filter.selectedCount', { count: 1 })
}
</script>
