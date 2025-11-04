<template>
  <!-- Header -->
  <sapling-header />

  <!-- Content -->
  <SaplingEntity
    :headers="headers"
    :items="items"
    :search="search"
    :page="page"
    :items-per-page="itemsPerPage"
    :total-items="totalItems"
    :is-loading="isLoading"
    :sort-by="sortBy"
    :entity-name="entityName"
    :entity-templates="entityTemplates"
    :entity="entity"
  :entity-permission="entityPermission || null"
    @update:search="onSearchUpdate"
    @update:page="onPageUpdate"
    @update:items-per-page="onItemsPerPageUpdate"
    @update:sortBy="onSortByUpdate"
    @reload="loadData"
  />
  
  <!-- Footer -->
  <sapling-footer />
</template>

<script lang="ts" setup>
// #region Imports
import { useRoute } from 'vue-router';
import { computed } from 'vue';
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingHeader from '@/components/SaplingHeader.vue';
import SaplingEntity from '@/components/entity/SaplingEntity.vue';
import { useSaplingEntity } from '@/composables/entity/useSaplingEntity';
// #endregion

// #region Entity Name
// Get the current route to determine the entity name
const route = useRoute();
const entityName = computed(() => route.params.entity as string);
// #endregion

// #region Entity Table State
// Use the entity table composable to manage table state and data
const {
  isLoading,
  items,
  headers,
  search,
  page,
  itemsPerPage,
  totalItems,
  sortBy,
  entityTemplates,
  entity,
  entityPermission,
  loadData
} = useSaplingEntity(entityName);
// #endregion

// #region Event Handlers
/**
 * Handler for updating the search value from SaplingEntity events.
 */
function onSearchUpdate(val: string) {
  search.value = val;
  page.value = 1;
}

/**
 * Handler for updating the page value from SaplingEntity events.
 */
function onPageUpdate(val: number) {
  page.value = val;
}

/**
 * Handler for updating the items per page from SaplingEntity events.
 */
function onItemsPerPageUpdate(val: number) {
  itemsPerPage.value = val;
  page.value = 1;
}

/**
 * Handler for updating the sortBy value from SaplingEntity events.
 */
function onSortByUpdate(val: unknown) {
  sortBy.value = val as typeof sortBy.value;
}
// #endregion
</script>