<template>
  <sapling-header />

    <EntityTable
      :headers="headers"
      :items="items"
      :search="search"
      :page="page"
      :items-per-page="itemsPerPage"
      :total-items="totalItems"
      :is-loading="isLoading"
      @update:search="val => { search = val; page = 1; }"
      @update:page="val => { page = val; }"
      @update:itemsPerPage="val => { itemsPerPage = val; page = 1; }"
    />
  <sapling-footer />
</template>

<script lang="ts" setup>
  import SaplingFooter from '@/components/SaplingFooter.vue';
  import SaplingHeader from '@/components/SaplingHeader.vue';
  import EntityTable from '@/components/EntityTable.vue';
  import { useEntityTable } from '@/composables/useEntityTable';

  const {
    isLoading,
    items,
    headers,
    search,
    page,
    itemsPerPage,
    totalItems
  } = useEntityTable('entity');
</script>