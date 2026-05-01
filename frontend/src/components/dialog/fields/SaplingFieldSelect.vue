<template>
  <v-menu
    v-model="menuOpen"
    max-width="600px"
    :close-on-content-click="false"
    scroll-strategy="block"
  >
    <template #activator="{ props: activatorProps }">
      <v-select
        :disabled="props.disabled"
        v-bind="activatorProps"
        :label="props.label"
        :items="selectedItems.map((item) => getCompactLabel(item, entityTemplates))"
        :rules="props.rules"
        :model-value="selectedItems.map((item) => getCompactLabel(item, entityTemplates))"
        multiple
        chips
        readonly
        @click:append-inner="menuOpen = !menuOpen"
        hide-details="auto"
        autocomplete="off"
      >
        <template #chip="{ item, index }">
          <v-chip
            class="sapling-field-select__chip"
            :closable="!props.disabled"
            size="small"
            @click:close="!props.disabled && removeChip(item, index)"
          >
            {{ getCompactLabel(selectedItems[index], entityTemplates) }}
          </v-chip>
        </template>
      </v-select>
    </template>
    <div class="glass-panel sapling-menu-surface">
      <sapling-table
        :entity-handle="entityHandle"
        :items="items"
        :search="search"
        :page="page"
        :items-per-page="itemsPerPage"
        :total-items="totalItems"
        :is-loading="isLoading"
        :sort-by="sortBy"
        :column-filters="columnFilters"
        :active-filter="activeFilter"
        :entity-templates="entityTemplates"
        :entity="entity"
        :entity-permission="entityPermission"
        :show-actions="false"
        :multi-select="true"
        :table-key="entityHandle"
        :selected="selectedItems"
        @update:page="onPageUpdate"
        @update:items-per-page="onItemsPerPageUpdate"
        @update:sort-by="onSortByUpdate"
        @update:column-filters="onColumnFiltersUpdate"
        @update:search="onSearchUpdate"
        @reload="loadData"
        @update:selected="onTableSelect"
      />
    </div>
  </v-menu>
</template>

<script lang="ts" setup>
// #region Imports
import SaplingTable from '@/components/table/SaplingTable.vue'
import type { SaplingGenericItem } from '@/entity/entity'
import { useSaplingTable } from '@/composables/table/useSaplingTable'
import { ref, watch } from 'vue'
import { getCompactLabel } from '@/utils/saplingTableUtil'
import { useSaplingSelectField } from '@/composables/fields/useSaplingSelectField'
import { DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants'
import ApiGenericService, { type FilterQuery } from '@/services/api.generic.service'

// #region Props and Emits
const props = defineProps<{
  label: string
  entityHandle: string
  modelValue?: SaplingGenericItem[]
  rules?: Array<(v: unknown) => true | string>
  placeholder?: string
  disabled?: boolean
  parentFilter?: FilterQuery
}>()
const emit = defineEmits(['update:modelValue'])
// #endregion

// #region Selection State
function onTableSelect(newSelected: SaplingGenericItem[]) {
  selectedItems.value = newSelected
}

// Entfernt ein Item aus den Chips und aktualisiert die Auswahl
function removeChip(item: string, index: number) {
  const updated = [...selectedItems.value]
  updated.splice(index, 1)
  selectedItems.value = updated
}
// #endregion

// #region Composable
const {
  items,
  search,
  page,
  itemsPerPage,
  totalItems,
  isLoading,
  sortBy,
  columnFilters,
  activeFilter,
  entityTemplates,
  entity,
  entityPermission,
  parentFilter,
  isInitialized,
  initializeEntityState,
  loadData,
  onSearchUpdate,
  onPageUpdate,
  onItemsPerPageUpdate,
  onColumnFiltersUpdate,
  onSortByUpdate,
} = useSaplingTable(ref(props.entityHandle), DEFAULT_PAGE_SIZE_SMALL, false, false)

const { selectedItems, menuOpen } = useSaplingSelectField(props)
// #endregion

watch(
  () => props.parentFilter,
  (value) => {
    const nextFilter = normalizeFilter(value)
    if (areFiltersEqual(parentFilter.value, nextFilter)) {
      return
    }

    parentFilter.value = nextFilter
    if (page.value !== 1) {
      page.value = 1
    }
  },
  { immediate: true, deep: true },
)

watch(menuOpen, (isOpen) => {
  if (!isOpen) {
    return
  }

  if (!isInitialized.value) {
    void initializeEntityState()
    return
  }

  void loadData()
})

// #region Lifecycle
watch(
  () => [entityTemplates.value, isLoading.value],
  async ([templates, loading]) => {
    if (!loading && templates && props.placeholder && selectedItems.value.length === 0) {
      const response = await ApiGenericService.find(props.entityHandle, {
        filter: combineFilters({ handle: props.placeholder }, props.parentFilter),
        limit: 1,
      })
      if (response.data && response.data.length > 0) {
        selectedItems.value = [response.data[0] as SaplingGenericItem]
      }
    }
  },
  { immediate: true },
)

watch(selectedItems, (val) => {
  const nextValue = val ?? []
  const currentValue = props.modelValue ?? []
  if (!areSameItemCollections(nextValue, currentValue)) {
    emit('update:modelValue', nextValue)
  }
})
// #endregion

function areSameItemCollections(left: Record<string, unknown>[], right: Record<string, unknown>[]) {
  if (left.length !== right.length) {
    return false
  }

  return left.every((item, index) => getItemIdentity(item) === getItemIdentity(right[index]))
}

function getItemIdentity(item?: Record<string, unknown>) {
  if (!item || typeof item !== 'object') {
    return ''
  }

  for (const key of ['handle']) {
    const value = item[key]
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return `${key}:${String(value)}`
    }
  }

  return JSON.stringify(item)
}

function combineFilters(...filters: Array<FilterQuery | undefined>): FilterQuery {
  const activeFilters = filters.filter(
    (filter): filter is FilterQuery => !!filter && Object.keys(filter).length > 0,
  )

  if (activeFilters.length === 0) {
    return {}
  }

  if (activeFilters.length === 1) {
    return activeFilters[0]
  }

  return {
    $and: activeFilters,
  }
}

function normalizeFilter(filter?: FilterQuery): FilterQuery {
  return filter ? (JSON.parse(JSON.stringify(filter)) as FilterQuery) : {}
}

function areFiltersEqual(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}
</script>

<style scoped>
.sapling-field-select__chip {
  margin: 0;
}
</style>
