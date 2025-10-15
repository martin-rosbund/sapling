<template>
  <!-- Main card container for the entity table -->
  <v-card flat style="height: 100%;">
    <!-- Search bar and create button -->
    <template v-slot:text>
      <div style="display: flex; align-items: center; gap: 8px;">
        <v-text-field
          :model-value="localSearch"
          @update:model-value="onSearchUpdate"
          label="Search"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          hide-details
          single-line
          style="flex: 1;"/>
        <v-btn icon color="primary" @click="openCreateDialog">
          <v-icon>mdi-plus</v-icon>
        </v-btn>
      </div>
    </template>
    <!-- Loading skeleton while data is loading -->
    <v-skeleton-loader
      v-if="isLoading"
      class="mx-auto"
      elevation="12"
      type="article, actions"/>
    <!-- Data table with server-side pagination and actions -->
    <template v-else>
      <v-data-table-server
        :height="tableHeight"
        :headers="actionHeaders"
        :items="items"
        :page="page"
        :items-per-page="itemsPerPage"
        :items-length="totalItems"
        :loading="isLoading"
        :server-items-length="totalItems"
        :footer-props="{ itemsPerPageOptions: [10, 25, 50, 100] }"
        :sort-by="sortBy"
        @update:page="onPageUpdate"
        @update:items-per-page="onItemsPerPageUpdate"
        @update:sort-by="onSortByUpdate"
      >
        <!-- Table row rendering extracted to a separate component for modularity -->
        <template #item="{ item, columns, index }">
          <EntityTableRow
            :item="(item as Record<string, unknown>)"
            :columns="(columns as { key: string; type?: string }[])"
            :index="index"
            :selected-row="selectedRow"
            @select-row="selectRow"
            @edit="openEditDialog"
            @delete="openDeleteDialog"
          />
        </template>
      </v-data-table-server>
    </template>

    <!-- Modular dialog components for edit and delete -->
    <EntityEditDialog
      :model-value="dialog.visible"
      :mode="dialog.mode"
      :item="dialog.item"
      :templates="templates"
      @update:model-value="val => dialog.visible = val"
      @save="saveDialog"
      @cancel="closeDialog"
    />
    <EntityDeleteDialog
      :model-value="deleteDialog.visible"
      :item="deleteDialog.item"
      @update:model-value="val => deleteDialog.visible = val"
      @confirm="confirmDelete"
      @cancel="closeDeleteDialog"
    />
  </v-card>
</template>

<script lang="ts" setup>
// Vue composition API imports
import { computed, ref, watch, onMounted, onBeforeUnmount, defineAsyncComponent } from 'vue';
// Dialog components for editing and deleting entities
import EntityEditDialog from './EntityEditDialog.vue';
import EntityDeleteDialog from './EntityDeleteDialog.vue';
// Utility functions for formatting
// Formatting is handled in EntityTableRow
// API service for backend communication
import ApiService from '@/services/api.service';
import type { EntityTemplate } from '@/entity/structure';

// Table row component for modularity
const EntityTableRow = defineAsyncComponent(() => import('./EntityTableRow.vue'));

// Table header type definition
type EntityTableHeader = {
  key: string;
  title: string;
  type?: string;
  // Additional properties for table headers
  [key: string]: unknown;
};
// Sort item type definition
type SortItem = { key: string; order?: 'asc' | 'desc' };

// Props definition for the table
const props = defineProps<{
  headers: EntityTableHeader[],
  items: unknown[],
  search: string,
  page: number,
  itemsPerPage: number,
  totalItems: number,
  isLoading: boolean,
  sortBy: SortItem[],
  entityName: string,
  templates: EntityTemplate[]
}>();

// Emits for parent communication
const emit = defineEmits([
  'update:search',
  'update:page',
  'update:itemsPerPage',
  'update:sortBy',
  'reload'
]);

// Local search state
const localSearch = ref(props.search);
// Watch for prop changes to update local state
watch(() => props.search, (val) => {
  localSearch.value = val;
});

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
function onItemsPerPageUpdate(val: number) {
  emit('update:itemsPerPage', val);
}
// Emit sort update
function onSortByUpdate(val: SortItem[]) {
  emit('update:sortBy', val);
}

// Table height is responsive to window size
const tableHeight = ref(600);
function updateTableHeight() {
  tableHeight.value = Math.max(window.innerHeight - 280, 300);
}
onMounted(() => {
  updateTableHeight();
  window.addEventListener('resize', updateTableHeight);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateTableHeight);
});

// Row selection state
const selectedRow = ref<number | null>(null);
function selectRow(index: number) {
  selectedRow.value = index;
}

// CRUD dialog state
const dialog = ref<{ visible: boolean; mode: 'create' | 'edit'; item: unknown | null }>({ visible: false, mode: 'create', item: null });
const deleteDialog = ref<{ visible: boolean; item: unknown | null }>({ visible: false, item: null });

// Open create dialog
function openCreateDialog() {
  dialog.value = { visible: true, mode: 'create', item: null };
}
// Open edit dialog
function openEditDialog(item: unknown) {
  dialog.value = { visible: true, mode: 'edit', item };
}
// Close dialog
function closeDialog() {
  dialog.value.visible = false;
}
// Save dialog (placeholder for save logic)
function saveDialog() {
  // Implement save logic here
  closeDialog();
}
// Open delete dialog
function openDeleteDialog(item: unknown) {
  deleteDialog.value = { visible: true, item };
}
// Close delete dialog
function closeDeleteDialog() {
  deleteDialog.value.visible = false;
}

// Build primary key query for delete
function buildPkQuery(item: unknown, templates: EntityTemplate[]): Record<string, unknown> {
  if (!item || typeof item !== 'object') return {};
  const pkFields = templates.filter(t => t.isPrimaryKey).map(t => t.name);
  return pkFields.reduce((acc, key) => ({ ...acc, [key]: (item as Record<string, unknown>)[key] }), {});
}

// Confirm delete action
async function confirmDelete() {
  if (!deleteDialog.value.item) return;
  const pk = buildPkQuery(deleteDialog.value.item, props.templates);
  // Cast pk to Record<string, string | number> for API compatibility
  await ApiService.delete(`generic/${props.entityName}`, pk as Record<string, string | number>);
  closeDeleteDialog();
  emit('reload');
}

// Add actions column to headers
const actionHeaders = computed(() => [
  ...props.headers,
  { key: '__actions', title: '', sortable: false }
]);
</script>

<style scoped>
/* Highlight for selected row */
.selected-row {
  background-color: #e0e0e01a;
}
/* Right-align actions cell */
.actions-cell {
  text-align: right;
}
/* Flex layout for action buttons */
.actions-wrapper {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}
</style>