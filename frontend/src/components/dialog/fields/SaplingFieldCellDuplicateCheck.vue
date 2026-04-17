<template>
  <v-menu v-model="menuOpen" max-width="600px" :close-on-content-click="false">
    <template #activator="{ props: activatorProps }">
      <v-text-field
        v-bind="activatorProps"
        :label="label"
        :placeholder="placeholder"
        :disabled="disabled"
        :rules="rules"
        :required="required"
        :model-value="search"
        @update:model-value="onSearchInput"
        clearable
        hide-details="auto"
        autocomplete="off"
      />
    </template>
    <div style="min-width: 400px; max-height: 400px; overflow: auto" class="glass-panel">
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
import SaplingTable from '@/components/table/SaplingTable.vue'
import type { SaplingGenericItem } from '@/entity/entity'
import { useSaplingTable } from '@/composables/table/useSaplingTable'
import { ref, watch } from 'vue'
import type { EntityTemplate } from '@/entity/structure'

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
const search = ref(typeof props.modelValue === 'string' ? props.modelValue : '')
const selectedItem = ref<SaplingGenericItem | null>(null)

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
  selectedItem.value = newSelected[0] ?? null
  if (newSelected[0]) {
    search.value = newSelected[0][props.modelName ?? '']
    menuOpen.value = false
    emit('update:modelValue', search.value) // Immer search-Wert ins Form schreiben
    emit('select-record', newSelected[0]) // selectedItem nur für Duplikatscheck
  }
}

function onSearchInput(val: string) {
  search.value = val
  emit('update:modelValue', val) // Sofort ins Form schreiben
  onSearchUpdate(val)
}

watch(
  () => props.modelValue,
  (val) => {
    search.value = typeof val === 'string' ? val : ''
  },
)
</script>
