<template>
  <!-- Header -->
  <sapling-header />

  <v-skeleton-loader
    v-if="isLoading"
    class="mx-auto transparent"
    elevation="12"
    type="text"/>

  <!-- Search Component -->
  <sapling-search v-else
    :model-value="search"
    :entity="entity"
    @update:model-value="onSearchUpdate"
  />
  
  <!-- Content -->
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
    @reload="loadData"
  />

  <!-- Footer -->
  <sapling-footer />
</template>

<script lang="ts" setup>
// #region Imports
import { useRoute } from 'vue-router';
import { computed } from 'vue';
import SaplingFooter from '@/components/system/SaplingFooter.vue';
import SaplingHeader from '@/components/system/SaplingHeader.vue';
import SaplingTable from '@/components/table/SaplingTable.vue';
import SaplingSearch from '@/components/system/SaplingSearch.vue';
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