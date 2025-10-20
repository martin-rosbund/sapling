<template>
  <!-- Header -->
  <sapling-header />

  <!-- Content -->
  <v-skeleton-loader
    v-if="isLoading"
    class="mx-auto"
    elevation="12"
    type="article, actions"/>
  <template v-else>
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
      :entity-name="entityName"
      :templates="templates"
      :entity="entity"
      @update:search="onSearchUpdate"
      @update:page="onPageUpdate"
      @update:itemsPerPage="onItemsPerPageUpdate"
      @update:sortBy="onSortByUpdate"
      @reload="loadData"
    />
  </template>
  
  <!-- Footer -->
  <sapling-footer />
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router';
import { computed } from 'vue';

// Components
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingHeader from '@/components/SaplingHeader.vue';
import EntityTable from '@/components/entity/EntityTable.vue';

// Composables
import { useEntityTable } from '@/composables/useEntityTable';

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
} = useEntityTable(entityName);

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