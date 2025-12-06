<template>
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
      :multi-select="true"
      :table-key="entityName"
      @update:page="onPageUpdate"
      @update:items-per-page="onItemsPerPageUpdate"
      @update:sort-by="onSortByUpdate"
      @update:search="onSearchUpdate"
      @reload="loadData"
    />
</template>

<script lang="ts" setup>

// #region Imports
import SaplingTable from '@/components/table/SaplingTable.vue';
import type { SaplingGenericItem } from '@/entity/entity';
import { useSaplingTable } from '@/composables/table/useSaplingTable';
import { ref } from 'vue';
// #endregion

// #region Props and Emits
const props = defineProps<{
  label: string,
  entityName: string,
  modelValue?: SaplingGenericItem[],
  rules?: Array<(v: unknown) => true | string>;
}>();
const emit = defineEmits(['update:modelValue']);
// #endregion

// #region Composable
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
} = useSaplingTable(ref(props.entityName));
// #endregion
</script>