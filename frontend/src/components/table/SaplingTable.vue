<template>
    <v-skeleton-loader
    v-if="isLoading"
    class="mx-auto fill-height glass-panel"
    elevation="12"
    type="article, actions, table"/>
  <template v-else>
      <sapling-search
        :model-value="search ?? ''"
        :entity="entity"
        @update:model-value="onSearchUpdate"
      />
    <!-- Multi-select UI -->
    <div v-if="multiSelect" class="multi-select-bar transparent" style="display: flex; align-items: center; gap: 1rem; margin-bottom: 8px; height: 30px; padding: 8px 16px;">
      <v-icon color="primary">mdi-checkbox-multiple-marked</v-icon>
      <span>{{ selectedRows.length }} {{ $t('global.selected') }}</span>
      <v-btn v-if="selectedRows.length" size="small" color="primary" variant="text" @click="clearSelection">
        <v-icon start>mdi-close</v-icon>
        {{ $t('global.clearSelection') }}
      </v-btn>
    </div>
    <!-- Main card container for the entity table -->
    <div ref="tableContainerRef">
      <v-data-table-server
        density="compact"
        class="sapling-table glass-table"
        :headers="visibleHeaders"
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
        <template #[`header.__actions`]>
          <v-btn
            v-if="entity?.canInsert && entityPermission?.allowInsert"
            icon="mdi-plus"
            color="primary"
            @click="openCreateDialog"
            variant="text"
          />
        </template>
        <!-- Table row rendering extracted to a separate component for modularity -->
        <template #item="{ item, index }">
          <sapling-table-row
            :item="item"
            :columns="visibleHeaders"
            :index="index"
            :selected-row="selectedRow"
            :selected-rows="selectedRows"
            :multi-select="multiSelect"
            :entity="entity"
            :entity-permission="entityPermission"
            :entity-templates="entityTemplates"
            :entity-name="entityName"
            :show-actions="showActions"
            @select-row="selectRow"
            @delete="openDeleteDialog"
            @edit="openEditDialog"
            @show="openShowDialog"
          />
        </template>
      </v-data-table-server>
    </div>
    <sapling-delete persistent
      :model-value="deleteDialog.visible"
      :item="deleteDialog.item"
      @update:model-value="val => deleteDialog.visible = val"
      @confirm="confirmDelete"
      @cancel="closeDeleteDialog"
    />
    <sapling-edit
      :model-value="editDialog.visible"
      :mode="editDialog.mode"
      :item="editDialog.item"
      :parent="parent"
      :parent-entity="parentEntity"
      :templates="entityTemplates"
      :entity="entity"
      :showReference="true"
      @update:model-value="val => editDialog.visible = val"
      @save="saveDialog"
      @cancel="closeDialog"
    />
  </template>
</template>

<script lang="ts" setup>
// #region Imports
import { computed, ref, watch, defineAsyncComponent } from 'vue';
import type { AccumulatedPermission, EditDialogOptions, EntityTemplate, SaplingTableHeaderItem, SortItem } from '@/entity/structure';
import type { EntityItem, SaplingGenericItem } from '@/entity/entity';
import { DEFAULT_ENTITY_ITEMS_COUNT, DEFAULT_PAGE_SIZE_OPTIONS } from '@/constants/project.constants';
import SaplingDelete from '@/components/dialog/SaplingDelete.vue';
import SaplingEdit from '@/components/dialog/SaplingEdit.vue';
import ApiGenericService from '@/services/api.generic.service';
import SaplingSearch from '@/components/system/SaplingSearch.vue';
import { useI18n } from 'vue-i18n';
import { onMounted } from 'vue';
import { getTableHeaders } from '@/utils/saplingTableUtil';

 const { t } = useI18n();
// #endregion

// #region Async Components
// Table row component for modularity
const SaplingTableRow = defineAsyncComponent(() => import('./SaplingTableRow.vue'));
// #endregion

// #region Props and Emits
interface SaplingTableProps {
  items: SaplingGenericItem[],
  parent?: SaplingGenericItem | null,
  parentEntity?: EntityItem | null,
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
  headers?: SaplingTableHeaderItem[],
  multiSelect?: boolean,
  selected?: SaplingGenericItem[],
}

const props = defineProps<SaplingTableProps>();

const emit = defineEmits([
  'update:search',
  'update:page',
  'update:itemsPerPage',
  'update:sortBy',
  'reload',
  'edit',
  'delete',
  'update:selected',
]);
// #endregion

// #region State
const localSearch = ref(props.search); // Local search state
const selectedRows = ref<number[]>([]); // Multi-selection: indices
const selectedItems = ref<(SaplingGenericItem | undefined)[]>(props.selected ?? []); // Multi-selection: items
const selectedRow = ref<number | null>(null); // Single row selection state
const editDialog = ref<EditDialogOptions>({ visible: false, mode: 'create', item: null }); // CRUD dialog state
const deleteDialog = ref<{ visible: boolean; item: SaplingGenericItem | null }>({ visible: false, item: null }); // Delete dialog state

// Responsive Columns
const MIN_COLUMN_WIDTH = 160; // px
const MIN_ACTION_WIDTH = 80; // px
const windowWidth = ref(0);
const tableContainerRef = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;

import { onBeforeUnmount } from 'vue';

onMounted(() => {
  if (tableContainerRef.value) {
    resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        windowWidth.value = entry.contentRect.width;
      }
    });
    resizeObserver.observe(tableContainerRef.value);
    windowWidth.value = tableContainerRef.value.offsetWidth;
  }
});

onBeforeUnmount(() => {
  if (resizeObserver && tableContainerRef.value) {
    resizeObserver.unobserve(tableContainerRef.value);
    resizeObserver.disconnect();
  }
});
// #endregion

// #region Watchers
// Watch for prop changes to update local state
watch(() => props.search, (val) => {
  localSearch.value = val;
});
// Synchronisiere externe Auswahl mit interner Selektion
watch(() => props.selected, (newSelected) => {
  if (!Array.isArray(newSelected)) return;
  selectedItems.value = newSelected;
  // Finde die Indizes der selektierten Items in der aktuellen Items-Liste
  selectedRows.value = newSelected
    .map(sel => props.items.findIndex(item => JSON.stringify(item) === JSON.stringify(sel)))
    .filter(idx => idx !== -1);
}, { immediate: true });
// #endregion

// #region Methods
// Emit page update
function onSearchUpdate(val: number) {
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
  // Filter out any __actions sort requests
  const filtered = val.filter(v => v.key !== '__actions');
  if (filtered.length !== val.length) {
    // If __actions was present, do not emit any sort update
    return;
  }
  emit('update:sortBy', filtered);
}

// Handle row selection
function selectRow(index: number) {
  if (props.multiSelect) {
    const idx = selectedRows.value.indexOf(index);
    if (idx === -1) {
      selectedRows.value.push(index);
    } else {
      selectedRows.value.splice(idx, 1);
    }
    selectedItems.value = selectedRows.value.map(i => props.items[i]);
    emit('update:selected', selectedItems.value);
  } else {
    selectedRow.value = index;
    emit('update:selected', [props.items[index]]);
  }
}

function clearSelection() {
  selectedRows.value = [];
  selectedItems.value = [];
  emit('update:selected', []);
}
// #endregion

// #region Edit Dialog Methods
// Open create dialog
function openCreateDialog() {
  editDialog.value = { visible: true, mode: 'create', item: null };
}

// Open edit dialog
function openEditDialog(item: SaplingGenericItem) {
  editDialog.value = { visible: true, mode: 'edit', item };
}

// Open edit dialog
function openShowDialog(item: SaplingGenericItem) {
  editDialog.value = { visible: true, mode: 'readonly', item };
}
// Close dialog
function closeDialog() {
  editDialog.value.visible = false;
}

// Save dialog (handles both create and edit)
async function saveDialog(item: SaplingGenericItem) {
  if (!props.entityName || !props.entityTemplates) return;
  if (editDialog.value.mode === 'edit' && editDialog.value.item) {
    // Build primary key from the old item
    const pk = buildPkQuery(editDialog.value.item, props.entityTemplates);
    await ApiGenericService.update(props.entityName, pk as Record<string, string | number>, item);
  } else if (editDialog.value.mode === 'create') {
    await ApiGenericService.create(props.entityName, item);
  }
  closeDialog();
  emit('reload');
}
// #endregion

// Confirm delete action
async function confirmDelete() {
  if (!deleteDialog.value.item) return;
  const pk = buildPkQuery(deleteDialog.value.item, props.entityTemplates);
  // Cast pk to Record<string, string | number> for API compatibility
  await ApiGenericService.delete(`${props.entityName}`, pk as Record<string, string | number>);
  closeDeleteDialog();
  emit('reload');
}

// Open delete dialog
function openDeleteDialog(item: SaplingGenericItem) {
  deleteDialog.value = { visible: true, item };
}
// Close delete dialog
function closeDeleteDialog() {
  deleteDialog.value.visible = false;
}
// #endregion

// #region Computed
// Add actions column to headers (as first column)
const visibleHeaders = computed(() => {
  const baseHeaders = getTableHeaders(props.entityTemplates, props.entity, t);
  const totalWidth = windowWidth.value > 0 ? windowWidth.value : window.innerWidth;
  const actionCol = props.showActions ? MIN_ACTION_WIDTH : 0;
  const maxCols = Math.floor((totalWidth - actionCol) / MIN_COLUMN_WIDTH);
  let headers = baseHeaders.slice(0, maxCols); 
  // Remove any existing __select/__actions column
  headers = headers.filter(h => h.key !== '__select' && h.key !== '__actions');
  // Add multi-select checkbox column always as first column if enabled
  if (props.multiSelect) {
    headers = [{
      key: '__select',
      title: '',
      name: '__select',
      type: 'select',
    }, ...headers];
  }
  // Add actions column always as last column if enabled
  if (props.showActions) {
    headers = [...headers, {
      key: '__actions',
      title: '',
      name: '__actions',
      type: 'actions',
    }];
  }
  return headers;
});
// #endregion

// Build primary key query for delete / save
function buildPkQuery(item: SaplingGenericItem, templates: EntityTemplate[]): SaplingGenericItem {
  if (!item || typeof item !== 'object') return {};
  const pkFields = templates.filter(t => t.isPrimaryKey).map(t => t.name);
  const result: SaplingGenericItem = {};
  for (const key of pkFields) {
    const value = (item)[key];
    result[key] = value;
  }
  return result;
}
</script>