<template>
  <div class="sapling-app-layout">
    <!-- Header -->
    <sapling-header/>
    
    <!-- Content -->
     <div class="sapling-content">
      <sapling-table
        :entity-name="entityName"
        :items="items"
        :search="search"
        :page="page"
        :items-per-page="itemsPerPage"
        :total-items="totalItems"
        :is-loading="isLoading"
        :sort-by="sortBy"
        :entity-templates="entityTemplates"
        :entity="entity"
        :entity-permission="entityPermission"
        :show-actions="true"
        :multi-select="false"
        :table-key="entityName"
        @update:page="onPageUpdate"
        @update:items-per-page="onItemsPerPageUpdate"
        @update:sort-by="onSortByUpdate"
        @update:search="onSearchUpdate"
        @reload="loadData"
      />
     </div>

    <!-- Footer -->
    <sapling-footer/>
  </div>
</template>

<script lang="ts" setup>
// #region Imports
import { useRoute } from 'vue-router';
import { computed } from 'vue';
import SaplingFooter from '@/components/system/SaplingFooter.vue';
import SaplingHeader from '@/components/system/SaplingHeader.vue';
import SaplingTable from '@/components/table/SaplingTable.vue';
import { useSaplingTable } from '@/composables/table/useSaplingTable';
// #endregion

// #region Entity Name
// Get the current route to determine the entity name
const route = useRoute();
const entityName = computed(() => route.params.entity as string);
// #endregion

// #region Entity Table State
// Use the entity table composable to manage table state and data
const {
  items,
  search,
  page,
  itemsPerPage,
  totalItems,
  isLoading,
  sortBy,
  entityTemplates,
  entity,
  entityPermission,
  loadData,
  onSearchUpdate,
  onPageUpdate,
  onItemsPerPageUpdate,
  onSortByUpdate,
} = useSaplingTable(entityName);
// #endregion
</script>