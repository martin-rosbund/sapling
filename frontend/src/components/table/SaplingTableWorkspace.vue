<template>
  <SaplingTable
    :key="entityHandle"
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
    :show-actions="true"
    :multi-select="true"
    :show-favorite="true"
    :show-add="true"
    :table-key="entityHandle"
    @update:page="onPageUpdate"
    @update:items-per-page="onItemsPerPageUpdate"
    @update:sort-by="onSortByUpdate"
    @update:column-filters="onColumnFiltersUpdate"
    @update:search="onSearchUpdate"
    @reload="loadData"
  />
</template>

<script lang="ts" setup>
import { toRef } from 'vue'
import SaplingTable from '@/components/table/SaplingTable.vue'
import { useSaplingTable } from '@/composables/table/useSaplingTable'
import { DEFAULT_PAGE_SIZE_MEDIUM } from '@/constants/project.constants'

const props = defineProps<{
  entityHandle: string
}>()

const entityHandle = toRef(props, 'entityHandle')

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
  loadData,
  onSearchUpdate,
  onPageUpdate,
  onItemsPerPageUpdate,
  onColumnFiltersUpdate,
  onSortByUpdate,
} = useSaplingTable(entityHandle, DEFAULT_PAGE_SIZE_MEDIUM, true)
</script>
