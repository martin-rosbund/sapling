<template>
  <!-- Header for the entity view -->
  <sapling-header />

  <!-- EntityTable component displays the main data table for the entity -->
  <EntityTable
    :headers="headers"
    :items="items"
    :search="search"
    :page="page"
    :items-per-page="itemsPerPage"
    :total-items="totalItems"
    :is-loading="isLoading"
    :sort-by="sortBy"
    :entity-name="entity"
    :templates="templates"
    @update:search="onSearchUpdate"
    @update:page="onPageUpdate"
    @update:itemsPerPage="onItemsPerPageUpdate"
    @update:sortBy="onSortByUpdate"
    @reload="loadData"
  />

  <!-- Footer for the entity view -->
  <sapling-footer />
</template>

<script lang="ts" setup>
// Import required components and composables
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingHeader from '@/components/SaplingHeader.vue';
import EntityTable from '@/components/entity/EntityTable.vue';
import { useEntityTable } from '@/composables/useEntityTable';
import { useRoute } from 'vue-router';
import { computed } from 'vue';

// Get the current route to determine the entity name
const route = useRoute();
const entity = computed(() => route.params.entity as string);

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
  templates,
  loadData
} = useEntityTable(entity);

// Handlers for updating state from EntityTable events
function onSearchUpdate(val: string) {
  search.value = val;
  page.value = 1;
}
function onPageUpdate(val: number) {
  page.value = val;
}
function onItemsPerPageUpdate(val: number) {
  itemsPerPage.value = val;
  page.value = 1;
}
function onSortByUpdate(val: unknown) {
  sortBy.value = val as typeof sortBy.value;
}
</script>