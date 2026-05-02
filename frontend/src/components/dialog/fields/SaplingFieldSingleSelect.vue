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
        :items="items.map((item) => getEntityValueLabel(item, entityTemplates))"
        :rules="props.rules"
        :model-value="selectedItem ? getEntityValueLabel(selectedItem, entityTemplates) : null"
        readonly
        @click:append-inner="menuOpen = !menuOpen"
        hide-details="auto"
        autocomplete="off"
      >
        <template #selection="{}">
          <v-chip
            class="sapling-field-single-select__chip"
            :closable="!props.disabled"
            size="small"
            @click:close="!props.disabled && removeChip()"
          >
            {{ getEntityValueLabel(selectedItem, entityTemplates) }}
          </v-chip>
        </template>
      </v-select>
    </template>
    <div class="glass-panel sapling-menu-surface">
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
import SaplingTable from '@/components/table/SaplingTable.vue'
import type { SaplingGenericItem } from '@/entity/entity'
import { useSaplingTable } from '@/composables/table/useSaplingTable'
import { ref, watch } from 'vue'
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

// #region Selection State
function onTableSelect(newSelected: SaplingGenericItem[]) {
  selectedItem.value = newSelected[0] ?? null

  if (newSelected[0]) {
    menuOpen.value = false
  }
}

// Entfernt das ausgewählte Item, wenn der Chip geschlossen wird und synchronisiert die Tabelle
function removeChip() {
  selectedItem.value = null
  // Trigger table selection update
  onTableSelect([])
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

const { selectedItem, menuOpen } = useSaplingSingleSelectField(props)
const { combineFilters, normalizeFilter, areFiltersEqual } = useSaplingReferenceFilter()
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
// #endregion

watch(selectedItem, (val) => {
  emit('update:modelValue', val)
})
</script>
