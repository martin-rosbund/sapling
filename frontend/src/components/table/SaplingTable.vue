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
    <SaplingTableMultiSelect
      v-if="multiSelect"
      :multiSelect="multiSelect"
      :selectedRows="selectedRows"
      :showActions="showActions"
      :entity="entity"
      :entity-permission="entityPermission"
      @clearSelection="clearSelection"
      @deleteAllSelected="deleteAllSelected"
      @selectAll="selectAllRows"
    />
    <!-- Main card container for the entity table -->
    <div ref="tableContainerRef">
      <v-data-table-server
        density="compact"
        class="sapling-table"
        :headers="visibleHeaders"
        :items="items"
        :page="page"
        :items-per-page="itemsPerPage"
        :items-per-page-options="DEFAULT_PAGE_SIZE_OPTIONS"
        :items-length="totalItems"
        :loading="isLoading"
        :server-items-length="totalItems"
        :sort-by="sortBy"
        @update:page="onPageUpdate"
        @update:items-per-page="onItemsPerPageUpdate"
        @update:sort-by="onSortByUpdate"
      >
        <template #headers="{ columns, isSorted, getSortIcon, toggleSort }">
          <tr>
            <template
              v-for="column in columns"
              :key="String(column.key ?? column.title ?? '')"
            >
              <th class="sapling-table-header-cell">
                <template v-if="column.key === '__actions'">
                  <v-btn-group density="compact" style="gap: 2px;">
                    <v-btn size="x-small" color="primary" @click="downloadJSON" variant="text" style="min-width: 28px; padding: 0 4px;">
                      <v-icon>mdi-download</v-icon>
                    </v-btn>
                    <v-btn size="x-small" v-if="entity?.canInsert && entityPermission?.allowInsert" color="primary" @click="openCreateDialog" variant="text" style="min-width: 28px; padding: 0 4px;">
                      <v-icon>mdi-plus</v-icon>
                    </v-btn>
                  </v-btn-group>
                </template>
                <template v-else-if="column.key === '__select'">
                  <span></span>
                </template>
                <template v-else-if="isColumnFilterable(column)">
                  <div class="sapling-table-filter-shell">
                    <SaplingTableColumnFilter
                      :column="column"
                      :filter-item="getColumnFilterItem(String(column.key ?? ''))"
                      :title="String(column.title ?? '')"
                      :operator-options="getFilterOperatorOptions(column)"
                      :sort-icon="isSorted(column) ? getSortIcon(column) : 'mdi-swap-vertical'"
                      @update:filter="val => onColumnFilterChange(String(column.key ?? ''), val)"
                      @sort="toggleSort(column)"
                    />
                  </div>
                </template>
                <template v-else>
                  <button
                    class="sapling-table-header-button"
                    type="button"
                    @click="toggleSort(column)"
                  >
                    <span>{{ column.title }}</span>
                    <v-icon v-if="isSorted(column)" size="small">{{ getSortIcon(column) }}</v-icon>
                  </button>
                </template>
              </th>
            </template>
          </tr>
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
            :entity-handle="entityHandle"
            :show-actions="showActions"
            @select-row="selectRow"
            @delete="openDeleteDialog"
            @edit="openEditDialog"
            @show="openShowDialog"
            @copy="openCopyDialog"
          />
        </template>
      </v-data-table-server>
    </div>
    <SaplingDialogDelete persistent
      :model-value="deleteDialog.visible"
      :item="deleteDialog.item"
      @update:model-value="val => deleteDialog.visible = val"
      @confirm="confirmDelete"
      @cancel="closeDeleteDialog"
    />
    <SaplingDialogDelete
      persistent
      :model-value="bulkDeleteDialog.visible"
      :item="bulkDeleteDialog.items"
      @update:model-value="val => bulkDeleteDialog.visible = val"
      @confirm="confirmBulkDelete"
      @cancel="closeBulkDeleteDialog"
    />
    <SaplingDialogEdit
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
      @update:mode="editDialog.mode = $event"
      @update:item="editDialog.item = $event"
    />
  </template>
</template>

<script lang="ts" setup>
// #region Imports
import { computed, ref, watch, defineAsyncComponent } from 'vue';
import type { AccumulatedPermission, ColumnFilterItem, ColumnFilterOperator, EditDialogOptions, EntityTemplate, SaplingTableHeaderItem, SortItem } from '@/entity/structure';
import type { EntityItem, SaplingGenericItem } from '@/entity/entity';
import { DEFAULT_ENTITY_ITEMS_COUNT, DEFAULT_PAGE_SIZE_OPTIONS } from '@/constants/project.constants';
import SaplingDialogEdit from '@/components/dialog/SaplingDialogEdit.vue';
import SaplingDialogDelete from '@/components/dialog/SaplingDialogDelete.vue';
import ApiGenericService, { type FilterQuery } from '@/services/api.generic.service';
import SaplingSearch from '@/components/system/SaplingSearch.vue';
import SaplingTableMultiSelect from './SaplingTableMultiSelect.vue';
import SaplingTableColumnFilter from './filter/SaplingTableColumnFilter.vue';
import { useI18n } from 'vue-i18n';
import { onMounted } from 'vue';
import {
  buildTableFilter,
  buildTableOrderBy,
  getAllowedColumnFilterOperators,
  getDefaultColumnFilterOperatorForTemplate,
  getTableHeaders,
  isFilterableTableColumn,
} from '@/utils/saplingTableUtil';
import '@/assets/styles/SaplingTable.css';

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
  entityHandle: string,
  entity: EntityItem | null,
  entityPermission: AccumulatedPermission | null,
  entityTemplates: EntityTemplate[],
  parentFilter?: Record<string, unknown>,
  columnFilters?: Record<string, ColumnFilterItem>,
  activeFilter?: FilterQuery,
  showActions: boolean,
  tableKey: string,
  headers?: SaplingTableHeaderItem[],
  multiSelect?: boolean,
  selected?: SaplingGenericItem[],
  isOpenEditDialog?: boolean,
}

const props = defineProps<SaplingTableProps>();

type TableColumnLike = Record<string, unknown> & { key: string | null };

const emit = defineEmits([
  'update:search',
  'update:page',
  'update:itemsPerPage',
  'update:sortBy',
  'update:columnFilters',
  'reload',
  'edit',
  'delete',
  'update:selected',
]);
// #endregion

// #region State
const localSearch = ref(props.search); // Local search state
const localColumnFilters = ref<Record<string, ColumnFilterItem>>(cloneColumnFilters(props.columnFilters));
const selectedRows = ref<number[]>([]); // Multi-selection: indices
const selectedItems = ref<(SaplingGenericItem | undefined)[]>(props.selected ?? []); // Multi-selection: items
const selectedRow = ref<number | null>(null); // Single row selection state
const editDialog = ref<EditDialogOptions>({ visible: false, mode: 'create', item: null }); // CRUD dialog state
const deleteDialog = ref<{ visible: boolean; item: SaplingGenericItem | null }>({ visible: false, item: null }); // Delete dialog state
const bulkDeleteDialog = ref<{ visible: boolean; items: SaplingGenericItem[] }>({ visible: false, items: [] }); // Bulk delete dialog state
const initialEditDialogShown = ref(false); // Track if initial edit dialog was shown

// Responsive Columns
const MIN_COLUMN_WIDTH = 200; // px
const MIN_ACTION_WIDTH = 80; // px
const FILTER_OPERATOR_OPTIONS: Array<{ label: string; value: ColumnFilterOperator }> = [
  { label: '~', value: 'like' },
  { label: 'a*', value: 'startsWith' },
  { label: '*a', value: 'endsWith' },
  { label: '=', value: 'eq' },
  { label: '>', value: 'gt' },
  { label: '>=', value: 'gte' },
  { label: '<', value: 'lt' },
  { label: '<=', value: 'lte' },
];
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
watch(() => props.columnFilters, (val) => {
  localColumnFilters.value = cloneColumnFilters(val);
}, { deep: true });
// Synchronisiere externe Auswahl mit interner Selektion
watch(() => props.selected, (newSelected) => {
  if (!Array.isArray(newSelected)) return;
  selectedItems.value = newSelected;
  // Finde die Indizes der selektierten Items in der aktuellen Items-Liste
  selectedRows.value = newSelected
    .map(sel => props.items.findIndex(item => JSON.stringify(item) === JSON.stringify(sel)))
    .filter(idx => idx !== -1);
}, { immediate: true });

// Watch for items loaded and openEditDialog prop
watch(
  () => [props.items, props.isOpenEditDialog],
  ([items, isOpenEditDialog]) => {
    // Check prop or URL param
    if (
      isOpenEditDialog &&
      Array.isArray(items) &&
      items.length > 0 &&
      !editDialog.value.visible &&
      !initialEditDialogShown.value
    ) {
      // Show edit dialog for first item
      editDialog.value = { visible: true, mode: 'edit', item: items[0] ?? null };
      initialEditDialogShown.value = true;
    }
    // Reset flag if prop and URL param are both false
    if (!isOpenEditDialog) {
      initialEditDialogShown.value = false;
    }
  },
  { immediate: true, deep: true }
);
// #endregion

// #region Methods
function selectAllRows() {
  // Select all rows
  selectedRows.value = props.items.map((_, idx) => idx);
  selectedItems.value = selectedRows.value.map(i => props.items[i]);
  emit('update:selected', selectedItems.value);
}
// Emit page update
function onSearchUpdate(val: string) {
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

function onColumnFilterChange(key: string, filter: ColumnFilterItem | null) {
  const nextFilters = { ...localColumnFilters.value };

  if (!filter) {
    delete nextFilters[key];
    localColumnFilters.value = nextFilters;
    emit('update:columnFilters', localColumnFilters.value);
    return;
  }

  const normalizedFilter = normalizeColumnFilterItem(key, filter);
  if (isEmptyColumnFilterItem(normalizedFilter)) {
    delete nextFilters[key];
  } else {
    nextFilters[key] = normalizedFilter;
  }

  localColumnFilters.value = nextFilters;
  emit('update:columnFilters', localColumnFilters.value);
}

function getColumnFilterItem(key: string) {
  const filter = localColumnFilters.value[key];
  return filter ? { ...filter } : undefined;
}

function getFilterOperatorOptions(column: TableColumnLike) {
  return FILTER_OPERATOR_OPTIONS.filter((option) => getAllowedColumnFilterOperators(normalizeColumnTemplate(column)).includes(option.value));
}

function isColumnFilterable(column: TableColumnLike) {
  const normalizedColumn = normalizeColumnTemplate(column);
  return normalizedColumn ? isFilterableTableColumn(normalizedColumn) : false;
}

function getColumnTemplate(key: string) {
  return props.entityTemplates.find((item) => item.name === key || item.key === key);
}

function normalizeColumnTemplate(column?: TableColumnLike | Partial<EntityTemplate>) {
  if (!column) {
    return undefined;
  }

  return {
    key: ('key' in column ? column.key : undefined) ?? undefined,
    name: typeof column.name === 'string' ? column.name : undefined,
    type: typeof column.type === 'string' ? column.type : undefined,
    kind: typeof column.kind === 'string' ? column.kind : undefined,
    length: typeof column.length === 'number' ? column.length : undefined,
    options: Array.isArray(column.options)
      ? column.options.filter((option): option is string => typeof option === 'string') as EntityTemplate['options']
      : undefined,
    isReference: column.isReference === true,
  };
}

function cloneColumnFilters(filters?: Record<string, ColumnFilterItem>) {
  if (!filters) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(filters).map(([key, value]) => [key, { ...value }]),
  );
}

function normalizeColumnFilterItem(key: string, filter: ColumnFilterItem): ColumnFilterItem {
  return {
    operator: getNormalizedColumnFilterOperator(key, filter.operator),
    value: filter.value.trim(),
    rangeStart: filter.rangeStart?.trim() || undefined,
    rangeEnd: filter.rangeEnd?.trim() || undefined,
  };
}

function getNormalizedColumnFilterOperator(key: string, operator: ColumnFilterOperator) {
  const template = getColumnTemplate(key);
  const allowedOperators = getAllowedColumnFilterOperators(template);
  return allowedOperators.includes(operator)
    ? operator
    : getDefaultColumnFilterOperatorForTemplate(template);
}

function isEmptyColumnFilterItem(filter: ColumnFilterItem) {
  return filter.value.length === 0
    && (filter.rangeStart?.length ?? 0) === 0
    && (filter.rangeEnd?.length ?? 0) === 0;
}

// Download entity data as JSON using ApiGenericService
async function downloadJSON() {
  if (!props.entityHandle) return;
  const filter = props.activeFilter ?? buildTableFilter({
    search: props.search,
    columnFilters: localColumnFilters.value,
    entityTemplates: props.entityTemplates,
    parentFilter: props.parentFilter,
  });
  const orderBy = buildTableOrderBy(props.sortBy);
  // Build relations
  const relations = ['m:1'];

  // Call ApiGenericService to get the data
  const json = await ApiGenericService.downloadJSON(
    props.entityHandle,
    { filter, orderBy, relations }
  );
  // Create blob and trigger download
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${props.entityHandle}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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

async function deleteAllSelected() {
  // Show confirmation dialog before deleting
  if (!selectedRows.value.length) return;
  const itemsToDelete = selectedRows.value.map(idx => props.items[idx]).filter((item): item is SaplingGenericItem => !!item);
  bulkDeleteDialog.value = { visible: true, items: itemsToDelete };
}

async function confirmBulkDelete() {
  // Delete all selected items one by one after confirmation
  for (const item of bulkDeleteDialog.value.items) {
    if (item) {
      const pk = buildPkQuery(item, props.entityTemplates);
      await ApiGenericService.delete(`${props.entityHandle}`, pk as Record<string, string | number>);
    }
  }
  clearSelection();
  bulkDeleteDialog.value = { visible: false, items: [] };
  emit('reload');
}

function closeBulkDeleteDialog() {
  bulkDeleteDialog.value.visible = false;
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

// Open copy dialog
function openCopyDialog(item: SaplingGenericItem) {
  if (!props.entityTemplates) return;

  // Create a copy of the item, removing primary key fields
  const copiedItem = { ...item };
  props.entityTemplates
    .filter(template => template.isPrimaryKey || template.isUnique)
    .forEach(template => {
      delete copiedItem[template.name];
    });

  // Open the edit dialog in 'create' mode with the copied item
  editDialog.value = { visible: true, mode: 'create', item: copiedItem };
}

// Close dialog
function closeDialog() {
  editDialog.value.visible = false;
}

// Save dialog (handles both create and edit)
async function saveDialog(item: SaplingGenericItem) {
  if (!props.entityHandle || !props.entityTemplates) return;
  if (editDialog.value.mode === 'edit' && editDialog.value.item) {
    // Build primary key from the old item
    const pk = buildPkQuery(editDialog.value.item, props.entityTemplates);
    await ApiGenericService.update(props.entityHandle, pk as Record<string, string | number>, item);
  } else if (editDialog.value.mode === 'create') {
    await ApiGenericService.create(props.entityHandle, item);
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
  await ApiGenericService.delete(`${props.entityHandle}`, pk as Record<string, string | number>);
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
  const baseHeaders = props.headers?.length
    ? props.headers
    : getTableHeaders(props.entityTemplates, props.entity, t);
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

<style scoped>
.sapling-table-header-cell {
  white-space: nowrap;
}

.sapling-table-header-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.sapling-table-filter-input {
  min-width: 120px;
}

.sapling-table-filter-shell {
  display: flex;
  align-items: center;
  min-width: 0;
}
</style>