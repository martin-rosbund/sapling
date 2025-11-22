<template>
    <v-skeleton-loader
    v-if="isLoading"
    class="mx-auto fill-height"
    elevation="12"
    type="article, actions, table"/>
  <template v-else>
    <!-- Main card container for the entity table -->
    <v-card flat>
      <v-data-table-server
        class="sapling-entity-container"
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
          :item="(item as Record<string, unknown>)"
          :columns="visibleHeaders"
          :index="index"
          :selected-row="selectedRow"
          :entity="entity"
          :entity-permission="entityPermission"
          :entity-templates="entityTemplates"
          :entity-name="entityName"
          :show-actions="showActions"
          @select-row="selectRow"
          @delete="openDeleteDialog"
          @edit="openEditDialog"
        />
      </template>
    </v-data-table-server>
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
      :templates="entityTemplates"
      :entity="entity"
      :showReference="true"
      @update:model-value="val => editDialog.visible = val"
      @save="saveDialog"
      @cancel="closeDialog"
    />
  </v-card>
    </template>
</template>

<script lang="ts" setup>
// #region Imports
import { computed, ref, watch, defineAsyncComponent } from 'vue';
import type { AccumulatedPermission, EntityTemplate, FormType, SaplingTableHeaderItem, SortItem } from '@/entity/structure';
import type { EntityItem } from '@/entity/entity';
import '@/assets/styles/SaplingTable.css';
import { DEFAULT_ENTITY_ITEMS_COUNT, DEFAULT_PAGE_SIZE_OPTIONS } from '@/constants/project.constants';
import SaplingDelete from '../dialog/SaplingDelete.vue';
import SaplingEdit from '../dialog/SaplingEdit.vue';
import ApiGenericService from '@/services/api.generic.service';
// #endregion

// #region Async Components
// Table row component for modularity
const SaplingTableRow = defineAsyncComponent(() => import('./SaplingTableRow.vue'));
// #endregion

// #region Props and Emits

interface SaplingTableProps {
  headers: Array<SaplingTableHeaderItem & { headerProps?: { class?: string } }>,
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

const props = defineProps<SaplingTableProps>();

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
const editDialog = ref<{ visible: boolean; mode: 'create' | 'edit'; item: FormType | null }>({ visible: false, mode: 'create', item: null }); // CRUD dialog state
const deleteDialog = ref<{ visible: boolean; item: FormType | null }>({ visible: false, item: null }); // Delete dialog state

// Responsive Columns
import { onMounted, onUnmounted } from 'vue';
const MIN_COLUMN_WIDTH = 160; // px
const MIN_ACTION_WIDTH = 80; // px
const windowWidth = ref(window.innerWidth);

function handleResize() {
  windowWidth.value = window.innerWidth;
}

onMounted(() => {
  window.addEventListener('resize', handleResize);
});
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
// #endregion

// #region Watchers
// Watch for prop changes to update local state
watch(() => props.search, (val) => {
  localSearch.value = val;
});
// #endregion

// #region Methods
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

// #region Edit Dialog Methods
// Open create dialog
function openCreateDialog() {
  editDialog.value = { visible: true, mode: 'create', item: null };
}

// Open edit dialog
function openEditDialog(item: FormType) {
  editDialog.value = { visible: true, mode: 'edit', item };
}
// Close dialog
function closeDialog() {
  editDialog.value.visible = false;
}

// Save dialog (handles both create and edit)
async function saveDialog(item: unknown) {
  if (!props.entityName || !props.entityTemplates) return;
  if (editDialog.value.mode === 'edit' && editDialog.value.item) {
    // Build primary key from the old item
    const pk = buildPkQuery(editDialog.value.item, props.entityTemplates);
    await ApiGenericService.update(props.entityName, pk as Record<string, string | number>, item as Partial<Record<string, unknown>>);
  } else if (editDialog.value.mode === 'create') {
    await ApiGenericService.create(props.entityName, item as Partial<Record<string, unknown>>);
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
function openDeleteDialog(item: FormType) {
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
  const baseHeaders = props.headers.filter(x => !['1:m', 'm:n', 'n:m'].includes(x.kind ?? ''));
  const totalWidth = windowWidth.value;
  const actionCol = props.showActions ? MIN_ACTION_WIDTH : 0;
  const maxCols = Math.floor((totalWidth - actionCol) / MIN_COLUMN_WIDTH);
  let headers = baseHeaders.slice(0, maxCols);
  if (props.showActions) {
    headers = [{
      key: '__actions',
      title: '',
      sortable: false,
      name: '__actions',
      type: 'actions',
      length: 0,
      default: null,
      isPrimaryKey: false,
      isNullable: true,
      isUnique: false,
      kind: '',
      referenceName: '',
      referencedPks: [],
      headerProps: {},
      cellProps: {},
      isAutoIncrement: false,
      mappedBy: '',
      inversedBy: '',
      isReference: false,
      isEnum: false,
      enumValues: [],
      isArray: false,
      isSystem: false,
      isRequired: false,
      nullable: true,
      isShowInCompact: false,
    }, ...headers];
  }
  return headers;
});
// #endregion

// Build primary key query for delete / save
function buildPkQuery(item: unknown, templates: EntityTemplate[]): Record<string, unknown> {
  if (!item || typeof item !== 'object') return {};
  const pkFields = templates.filter(t => t.isPrimaryKey).map(t => t.name);
  const result: Record<string, unknown> = {};
  for (const key of pkFields) {
    const value = (item as Record<string, unknown>)[key];
    result[key] = value;
  }
  return result;
}
</script>