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
  loadData,
  onSearchUpdate,
  onPageUpdate,
  onItemsPerPageUpdate,
  onSortByUpdate
} = useSaplingEntity(entityName);
// #endregion
</script>