<template>
    <v-skeleton-loader
    v-if="isLoading"
    class="mx-auto fill-height"
    elevation="12"
    type="article, actions, table"/>
  <template v-else>
    <!-- SaplingEntity component displays the main data table for the entity -->
    <!-- Main card container for the entity table -->
    <v-card flat>
      <!-- Search bar and create button -->
      <template v-slot:text>
        <div style="display: flex; align-items: center; gap: 8px;">
          <v-text-field
            :model-value="localSearch"
            @update:model-value="onSearchUpdate"
            :label="$t('global.search')"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            hide-details
            single-line
            style="flex: 1;"/>
        </div>
      </template>
        <v-data-table-server
          class="sapling-entity-container"
          :headers="actionHeaders"
          :items="items"
          :page="page"
          :items-per-page="itemsPerPage"
          :items-length="totalItems"
          :loading="isLoading"
          :server-items-length="totalItems"
          :footer-props="{ itemsPerPageOptions: DEFAULT_PAGE_SIZE_OPTIONS }"
          :sort-by="sortBy"
          @update:page="onPageUpdate"
          @update:items-per-page="onItemsPerPageUpdate"
          @update:sort-by="onSortByUpdate"
        >
        <!-- Table row rendering extracted to a separate component for modularity -->
        <template #item="{ item, index }">
          <sapling-table-row
            :item="(item as Record<string, unknown>)"
            :columns="props.headers"
            :index="index"
            :selected-row="selectedRow"
            :entity="entity"
            :entity-permission="entityPermission"
            :entity-templates="entityTemplates"
            :entity-name="entityName"
            :show-actions="showActions"
            @select-row="selectRow"
          />
        </template>
      </v-data-table-server>
    </v-card>
    </template>
</template>

<script lang="ts" setup>
// #region Imports
import { computed, ref, watch, defineAsyncComponent, type Ref } from 'vue';
import type { AccumulatedPermission, EntityTemplate, SaplingEntityHeaderItem, SortItem } from '@/entity/structure';
import type { EntityItem } from '@/entity/entity';
import '@/assets/styles/SaplingEntity.css';
import { DEFAULT_ENTITY_ITEMS_COUNT, DEFAULT_PAGE_SIZE_OPTIONS } from '@/constants/project.constants';
import { useGenericLoader } from '@/composables/generic/useGenericLoader';
// #endregion

// #region Async Components
// Table row component for modularity
const SaplingTableRow = defineAsyncComponent(() => import('./SaplingTableRow.vue'));
// #endregion

// #region Props and Emits

interface SaplingEntityProps {
  headers: SaplingEntityHeaderItem[],
  items: unknown[],
  search: string,
  page: number,
  itemsPerPage: number,
  totalItems: number,
  isLoading: boolean,
  sortBy: SortItem[],
  entityName: string,
  entity: EntityItem | null,
  entityPermission: AccumulatedPermission | null,
  entityTemplates: EntityTemplate[],
  parentFilter?: Record<string, unknown>,
  showActions: boolean,
  tableKey: string,
}

const props = defineProps<SaplingEntityProps>();

const emit = defineEmits([
  'update:search',
  'update:page',
  'update:itemsPerPage',
  'update:sortBy',
  'reload',
  'edit',
  'delete'
]);
// #endregion

// #region State
const localSearch = ref(props.search); // Local search state
const selectedRow = ref<number | null>(null); // Row selection state
// #endregion

// #region Watchers
// Watch for prop changes to update local state
watch(() => props.search, (val) => {
  localSearch.value = val;
});
// #endregion

// #region Methods
// Emit search update
function onSearchUpdate(val: string) {
  localSearch.value = val;
  emit('update:search', val);
}
// Emit page update
function onPageUpdate(val: number) {
  emit('update:page', val);
}
// Emit items per page update
function onItemsPerPageUpdate(val: number|string) {
  const limit = val === -1? DEFAULT_ENTITY_ITEMS_COUNT : Number(val);
  emit('update:itemsPerPage', limit);
}
// Emit sort update
function onSortByUpdate(val: SortItem[]) {
  emit('update:sortBy', val);
}

// Handle row selection
function selectRow(index: number) {
  selectedRow.value = index;
}
// #endregion

// #region Computed
// Add actions column to headers (as first column)
const actionHeaders = computed(() => {
  // Add the Actions column as the first column
  return [
    { key: '__actions', title: '', sortable: false },
    ...props.headers.filter(x => !['1:m', 'm:n', 'n:m'].includes(x.kind ?? '')),
  ];
});
// #endregion
</script>