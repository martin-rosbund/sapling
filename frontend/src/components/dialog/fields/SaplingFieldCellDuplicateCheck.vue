<template>
  <v-menu
    v-model="menuOpen"
    max-width="600px"
    :close-on-content-click="false"
    scroll-strategy="block"
  >
    <template #activator="{ props: activatorProps }">
      <v-text-field
        v-bind="activatorProps"
        :label="label"
        :placeholder="placeholder"
        :disabled="disabled"
        :rules="rules"
        :required="required"
        :model-value="inputValue"
        @update:model-value="onSearchInput"
        clearable
        hide-details="auto"
        autocomplete="off"
      />
    </template>
    <div class="glass-panel sapling-menu-surface sapling-menu-surface--field-table">
      <sapling-table
        :entity-handle="entityHandle"
        :items="items"
        :search="inputValue"
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
        @update:search="onSearchInput"
        @reload="loadData"
        @update:selected="onTableSelect"
      />
    </div>
  </v-menu>
</template>

<script lang="ts" setup>
import SaplingTable from '@/components/table/SaplingTable.vue'
import type { SaplingGenericItem } from '@/entity/entity'
import { useSaplingTable } from '@/composables/table/useSaplingTable'
import { onBeforeUnmount, ref, watch } from 'vue'
import type { EntityTemplate } from '@/entity/structure'

const DUPLICATE_CHECK_SEARCH_DEBOUNCE_MS = 250

const props = defineProps<{
  label: string
  entityHandle: string
  modelValue?: SaplingGenericItem | null | undefined
  modelName?: string | null | undefined
  rules?: Array<(v: unknown) => true | string>
  placeholder?: string
  disabled?: boolean
  required?: boolean
  entityTemplates?: EntityTemplate[]
}>()
const emit = defineEmits(['update:modelValue', 'select-record'])

const menuOpen = ref(false)
const inputValue = ref(typeof props.modelValue === 'string' ? props.modelValue : '')
const selectedItem = ref<SaplingGenericItem | null>(null)
let searchUpdateTimeout: ReturnType<typeof setTimeout> | null = null

const {
  items,
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
  loadData,
  onSearchUpdate,
  onPageUpdate,
  onItemsPerPageUpdate,
  onColumnFiltersUpdate,
  onSortByUpdate,
} = useSaplingTable(ref(props.entityHandle), 10)

function onTableSelect(newSelected: SaplingGenericItem[]) {
  if (searchUpdateTimeout) {
    clearTimeout(searchUpdateTimeout)
    searchUpdateTimeout = null
  }

  selectedItem.value = newSelected[0] ?? null
  if (newSelected[0]) {
    const selectedValue = String(newSelected[0][props.modelName ?? ''] ?? '')
    inputValue.value = selectedValue
    onSearchUpdate(selectedValue)
    menuOpen.value = false
    emit('update:modelValue', selectedValue) // Immer search-Wert ins Form schreiben
    emit('select-record', newSelected[0]) // selectedItem nur für Duplikatscheck
  }
}

function onSearchInput(val: string) {
  const nextValue = val ?? ''
  inputValue.value = nextValue

  if (
    selectedItem.value &&
    String(selectedItem.value[props.modelName ?? ''] ?? '') !== nextValue
  ) {
    selectedItem.value = null
  }

  if (searchUpdateTimeout) {
    clearTimeout(searchUpdateTimeout)
  }

  searchUpdateTimeout = setTimeout(() => {
    searchUpdateTimeout = null
    emit('update:modelValue', nextValue)
    onSearchUpdate(nextValue)
  }, DUPLICATE_CHECK_SEARCH_DEBOUNCE_MS)
}

watch(
  () => props.modelValue,
  (val) => {
    const nextValue = typeof val === 'string' ? val : ''

    if (nextValue === inputValue.value) {
      return
    }

    if (searchUpdateTimeout) {
      clearTimeout(searchUpdateTimeout)
      searchUpdateTimeout = null
    }

    inputValue.value = nextValue
    onSearchUpdate(nextValue)
  },
)

onBeforeUnmount(() => {
  if (searchUpdateTimeout) {
    clearTimeout(searchUpdateTimeout)
    searchUpdateTimeout = null
  }
})
</script>
