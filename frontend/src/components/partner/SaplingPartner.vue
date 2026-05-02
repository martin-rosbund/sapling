<template>
  <v-container class="sapling-partner-container pa-0" density="compact" fluid>
    <section class="sapling-partner-layout">
      <div class="sapling-partner-main-table-col d-flex flex-column pa-0">
        <v-card flat class="sapling-partner-main-table-card rounded-0 d-flex flex-column">
          <v-card-text class="sapling-partner-table-text pa-0 flex-grow-1">
            <div class="sapling-partner-table-scroll">
              <SaplingTable
                :items="items"
                :search="search ?? ''"
                :page="page"
                :items-per-page="itemsPerPage"
                :total-items="totalItems"
                :is-loading="isLoading"
                :sort-by="sortBy"
                :column-filters="columnFilters"
                :active-filter="activeFilter"
                :entity-handle="entity?.handle || ''"
                :entity="entity"
                :entity-permission="entityPermission"
                :entity-templates="entityTemplates || []"
                :show-actions="true"
                :multi-select="true"
                :show-favorite="true"
                :show-add="true"
                :parent-filter="parentFilter"
                :table-key="tableKey"
                @update:search="onSearchUpdate"
                @update:page="onPageUpdate"
                @update:items-per-page="onItemsPerPageUpdate"
                @update:sort-by="onSortByUpdate"
                @update:column-filters="onColumnFiltersUpdate"
                @reload="loadData"
              />
            </div>
          </v-card-text>
        </v-card>
      </div>

      <SaplingWorkFilterPanel
        :key="filterDrawerKey"
        class="sapling-partner-filter-panel"
        @update:selected-peoples="onSelectedPeoplesUpdate"
      />
    </section>
  </v-container>
</template>

<script lang="ts" setup>
// #region Imports
import { defineAsyncComponent, toRef } from 'vue'
import SaplingWorkFilterPanel from '@/components/filter/SaplingWorkFilterPanel.vue'
import { useSaplingPartner } from '@/composables/partner/useSaplingPartner'
// #endregion

const SaplingTable = defineAsyncComponent(() => import('@/components/table/SaplingTable.vue'))

// #region Props
const props = defineProps<{ entityHandle: string }>()
const entityHandleRef = toRef(props, 'entityHandle')
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
  loadData,
  onSearchUpdate,
  onPageUpdate,
  onItemsPerPageUpdate,
  onColumnFiltersUpdate,
  onSortByUpdate,
  parentFilter,
  tableKey,
  filterDrawerKey,
  onSelectedPeoplesUpdate,
} = useSaplingPartner(entityHandleRef)

// #endregion
</script>
