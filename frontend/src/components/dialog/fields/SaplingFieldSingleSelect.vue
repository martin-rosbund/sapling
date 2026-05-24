<template>
  <v-menu
    v-model="menuOpen"
    max-width="600px"
    :close-on-content-click="false"
    :open-on-click="false"
    scroll-strategy="block"
  >
    <template #activator="{ props: activatorProps }">
      <div v-bind="activatorProps" class="sapling-field-select__activator">
        <v-autocomplete
          :disabled="props.disabled"
          :label="props.label"
          :items="autocompleteItems"
          :rules="props.rules"
          :model-value="selectedItem"
          :item-title="getAutocompleteItemTitle"
          :search="fieldSearch"
          return-object
          clearable
          hide-details="auto"
          hide-no-data
          no-filter
          :menu="false"
          autocomplete="off"
          @focus="openMenu"
          @mousedown:control="openMenu"
          @click:clear="clearSelection"
          @update:model-value="onActivatorModelUpdate"
          @update:search="onActivatorSearchUpdate"
        />
      </div>
    </template>
    <div class="glass-panel sapling-menu-surface sapling-menu-surface--field-table">
      <sapling-table
        v-if="menuOpen"
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
        :show-search="false"
        :multi-select="false"
        :table-key="entityHandle"
        :selected="selectedItem ? [selectedItem] : []"
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
import '@/assets/styles/components/SaplingSelectFields.css'
import SaplingTable from '@/components/table/SaplingTable.vue'
import type { SaplingGenericItem } from '@/entity/entity'
import { useSaplingTable } from '@/composables/table/useSaplingTable'
import { computed, ref, watch } from 'vue'
import { getEntityValueLabel } from '@/utils/saplingTableUtil'
import { useSaplingSingleSelectField } from '@/composables/fields/useSaplingSingleSelectField'
import { useSaplingReferenceFilter } from '@/composables/fields/useSaplingReferenceFilter'
import { DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants'
import ApiGenericService, { type FilterQuery } from '@/services/api.generic.service'
// #endregion

// #region Props and Emits
const props = defineProps<{
  label: string
  entityHandle: string
  modelValue?: SaplingGenericItem | null | undefined
  rules?: Array<(v: unknown) => true | string>
  placeholder?: string
  disabled?: boolean
  parentFilter?: FilterQuery
}>()
const emit = defineEmits(['update:modelValue'])
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

const { selectedItem, menuOpen } = useSaplingSingleSelectField(props)
const { combineFilters, normalizeFilter, areFiltersEqual } = useSaplingReferenceFilter()
const fieldSearch = ref('')
const autocompleteItems = computed(() => (selectedItem.value ? [selectedItem.value] : []))
// #endregion

// #region Selection State
function onTableSelect(newSelected: SaplingGenericItem[]) {
  selectedItem.value = newSelected[0] ?? null
  clearSearch()

  if (newSelected[0]) {
    menuOpen.value = false
  }
}

function onActivatorModelUpdate(value: SaplingGenericItem | null) {
  if (value == null) {
    clearSelection()
    return
  }

  const resolvedItem = resolveSaplingItem(value)
  if (resolvedItem) {
    selectedItem.value = resolvedItem
  }
}

function onActivatorSearchUpdate(value: string) {
  fieldSearch.value = value ?? ''
  openMenu()

  if (!isInitialized.value) {
    return
  }

  onSearchUpdate(fieldSearch.value)
}

function clearSelection() {
  selectedItem.value = null
  clearSearch()
}

function openMenu() {
  if (!props.disabled) {
    menuOpen.value = true
  }
}

function clearSearch() {
  if (fieldSearch.value === '' && search.value === '') {
    return
  }

  fieldSearch.value = ''
  if (isInitialized.value) {
    onSearchUpdate('')
  }
}

function getAutocompleteItemTitle(item: unknown) {
  return getEntityValueLabel(resolveSaplingItem(item), entityTemplates.value)
}
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

watch(menuOpen, async (isOpen) => {
  if (!isOpen) {
    return
  }

  if (!isInitialized.value) {
    await initializeEntityState()
    if (!menuOpen.value) {
      return
    }
  }

  if (search.value !== fieldSearch.value) {
    onSearchUpdate(fieldSearch.value)
    return
  }

  await loadData()
})

watch(
  () => [entityTemplates.value, isLoading.value],
  async ([templates, loading]) => {
    if (!loading && templates && props.placeholder && !selectedItem.value) {
      const response = await ApiGenericService.find(props.entityHandle, {
        filter: combineFilters({ handle: props.placeholder }, props.parentFilter),
        limit: 1,
      })
      if (response.data && response.data.length > 0) {
        selectedItem.value = response.data[0] as SaplingGenericItem
      }
    }
  },
  { immediate: true },
)

watch(selectedItem, (val) => {
  emit('update:modelValue', val)
})

function resolveSaplingItem(item: unknown): SaplingGenericItem | null {
  if (!item || typeof item !== 'object') {
    return null
  }

  if ('raw' in item && item.raw && typeof item.raw === 'object') {
    return item.raw as SaplingGenericItem
  }

  return item as SaplingGenericItem
}
</script>
