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
    :templates="templates"
    :entity="entity"
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
import { useRoute } from 'vue-router';
import { computed } from 'vue';

// Components
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingHeader from '@/components/SaplingHeader.vue';
import SaplingEntity from '@/components/entity/SaplingEntity.vue';

// Composables
import { useSaplingEntity } from '@/composables/useSaplingEntity';

// Get the current route to determine the entity name
const route = useRoute();
const entityName = computed(() => route.params.entity as string);

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
  entity,
  loadData
} = useSaplingEntity(entityName);

// Handlers for updating state from SaplingEntity events
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