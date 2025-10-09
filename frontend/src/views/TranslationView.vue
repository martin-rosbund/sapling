<template>
  <sapling-header />
  <v-skeleton-loader
    v-if="isLoading"
    class="mx-auto"
    style="height: 100%;"
    elevation="12"
    type="table"
  />
  <template v-else>
    <EntityTable
      :headers="headers"
      :items="items"
      :search="search"
      @update:search="search = $event"
    />
  </template>
  <sapling-footer />
</template>

<script lang="ts" setup>
  import SaplingFooter from '@/components/SaplingFooter.vue';
  import SaplingHeader from '@/components/SaplingHeader.vue';
  import EntityTable from '@/components/EntityTable.vue';
  import { useEntityTable } from '@/composables/useEntityTable';

  const { isLoading, items, headers, search } = useEntityTable('translation');
</script>