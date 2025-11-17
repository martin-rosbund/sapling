<template>
  <!-- Header -->
  <sapling-header />

  <v-skeleton-loader
    v-if="isLoading"
    class="mx-auto"
    elevation="12"
    type="text"/>
    <template v-else>
      <v-card-title class="bg-primary">
        <v-icon left>{{ entity?.icon }}</v-icon> {{ $t(`navigation.${entityName}`) }}
      </v-card-title>
    </template>

  <!-- Content -->
  <sapling-table
    :entity-name="entityName"
    :headers="headers"
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
    :table-key="entityName"
    @update:search="onSearchUpdate"
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
import { computed, ref } from 'vue';
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingHeader from '@/components/SaplingHeader.vue';
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
  headers,
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
} = useSaplingTable(entityName, ref("master"));
// #endregion
</script>