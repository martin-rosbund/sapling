<template>
    <v-skeleton-loader
    v-if="isLoading"
    class="mx-auto fill-height"
    elevation="12"
    type="article, actions, table"/>
  <template v-else>
    <!-- Card title for the entity table -->
    <v-card-title class="bg-primary">
        <v-icon left>{{ entity?.icon }}</v-icon> {{ $t(`navigation.${entityName}`) }}
    </v-card-title>
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
            <v-btn-group>
              <v-btn v-if="entity?.canInsert" icon="mdi-plus" color="primary" @click="openCreateDialog"/>
            </v-btn-group>
        </div>
      </template>
        <v-data-table-server
          class="sapling-entity-container"
          :headers="actionHeaders"
          :items="itemsToShow"
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
        <template #item="{ item, columns, index }">
          <SaplingEntityRow
            :item="(item as Record<string, unknown>)"
            :columns="(columns as unknown as EntityTemplate[])"
            :index="index"
            :selected-row="selectedRow"
            :entity="entity"
            :show-actions="true"
            @select-row="selectRow"
            @edit="openEditDialog"
            @delete="openDeleteDialog"
          />
        </template>
      </v-data-table-server>
      <!-- Modular dialog components for edit and delete -->
      <EntityEditDialog
        :model-value="dialog.visible"
        :mode="dialog.mode"
        :item="dialog.item"
        :templates="templates"
        :entity="entity"
        :showReference="true"
        @update:model-value="val => dialog.visible = val"
        @save="saveDialog"
        @cancel="closeDialog"
      />
      <EntityDeleteDialog persistent
        :model-value="deleteDialog.visible"
        :item="deleteDialog.item"
        @update:model-value="val => deleteDialog.visible = val"
        @confirm="confirmDelete"
        @cancel="closeDeleteDialog"
      />
    </v-card>
    </template>
</template>

<script lang="ts" setup>
import { computed, ref, watch, defineAsyncComponent } from 'vue';
import EntityEditDialog from '../dialog/EntityEditDialog.vue';
import EntityDeleteDialog from '../dialog/EntityDeleteDialog.vue';
import ApiGenericService from '@/services/api.generic.service';
import type { EntityTemplate, FormType } from '@/entity/structure';
import type { EntityItem } from '@/entity/entity';
import type { SaplingEntityHeader, SortItem } from '@/composables/useSaplingEntity';
import '@/assets/styles/SaplingEntity.css';
import { DEFAULT_ENTITY_ITEMS_COUNT, DEFAULT_PAGE_SIZE_OPTIONS } from '@/constants/project.constants';

// Table row component for modularity
const SaplingEntityRow = defineAsyncComponent(() => import('./SaplingEntityRow.vue'));

// Props definition for the table
const props = defineProps<{
  headers: SaplingEntityHeader[],
  items: unknown[],
  search: string,
  page: number,
  itemsPerPage: number,
  totalItems: number,
  isLoading: boolean,
  sortBy: SortItem[],
  entityName: string,
  templates: EntityTemplate[],
  entity: EntityItem | null,
  itemsOverride?: unknown[],
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
function onItemsPerPageUpdate(val: number|string) {
  const limit = val === -1? DEFAULT_ENTITY_ITEMS_COUNT : Number(val);
  emit('update:itemsPerPage', limit);
}
// Emit sort update
function onSortByUpdate(val: SortItem[]) {
  emit('update:sortBy', val);
}

// Row selection state
const selectedRow = ref<number | null>(null);
function selectRow(index: number) {
  selectedRow.value = index;
}

// CRUD dialog state
const dialog = ref<{ visible: boolean; mode: 'create' | 'edit'; item: FormType | null }>({ visible: false, mode: 'create', item: null });
const deleteDialog = ref<{ visible: boolean; item: FormType | null }>({ visible: false, item: null });

// Open create dialog
function openCreateDialog() {
  dialog.value = { visible: true, mode: 'create', item: null };
}
// Open edit dialog
function openEditDialog(item: FormType) {
  dialog.value = { visible: true, mode: 'edit', item };
}
// Close dialog
function closeDialog() {
  dialog.value.visible = false;
}
// Save dialog (implementierte Save-Logik)
async function saveDialog(item: unknown) {
  if (!props.entityName || !props.templates) return;
  if (dialog.value.mode === 'edit' && dialog.value.item) {
    // Primary Key aus dem alten Item bauen
    const pk = buildPkQuery(dialog.value.item, props.templates);
    await ApiGenericService.update(props.entityName, pk as Record<string, string | number>, item as Partial<Record<string, unknown>>);
  } else if (dialog.value.mode === 'create') {
    await ApiGenericService.create(props.entityName, item as Partial<Record<string, unknown>>);
  }
  closeDialog();
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

// Build primary key query for delete
function buildPkQuery(item: unknown, templates: EntityTemplate[]): Record<string, unknown> {
  if (!item || typeof item !== 'object') return {};
  const pkFields = templates.filter(t => t.isPrimaryKey).map(t => t.name);
  const result: Record<string, unknown> = {};
  for (const key of pkFields) {
    const template = templates.find(t => t.name === key);
    const value = (item as Record<string, unknown>)[key];
    // Check if this PK is a relation with joinColumns
    if (template && Array.isArray(template.joinColumns) && template.joinColumns.length > 0 && value && typeof value === 'object') {
      // For each joinColumn, extract the property from the related object
      for (const joinCol of template.joinColumns) {
        // joinCol: e.g. "language_handle"
        // Split at first _
        const [relationProp, relatedProp] = joinCol.split('_', 2);
        if (relationProp === key && relatedProp && (value as Record<string, unknown>)[relatedProp] !== undefined) {
          // Use the relation property name as the key, and the related property value as the value
          result[key] = (value as Record<string, unknown>)[relatedProp];
        }
      }
      // If no joinColumn matched, fallback to old behavior
      if (result[key] === undefined) {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Confirm delete action
async function confirmDelete() {
  if (!deleteDialog.value.item) return;
  const pk = buildPkQuery(deleteDialog.value.item, props.templates);
  // Cast pk to Record<string, string | number> for API compatibility
  await ApiGenericService.delete(`${props.entityName}`, pk as Record<string, string | number>);
  closeDeleteDialog();
  emit('reload');
}

// Add actions column to headers
const actionHeaders = computed(() => {
  // Hole alle Felder, die NICHT isAutoIncrement sind
  const filteredHeaders = props.headers.filter(header => {
    // Finde das Template für dieses Header-Feld
    const template = props.templates.find(t => t.name === header.key);
    // Zeige das Feld nur an, wenn es NICHT isAutoIncrement ist
    return !(template && template.isAutoIncrement);
  });
 
  // Füge die Actions-Spalte hinzu
  return [
    ...filteredHeaders,
    { key: '__actions', title: '', sortable: false }
  ];
});

// Items to show in the table, considering overrides
const itemsToShow = computed(() => props.itemsOverride ?? props.items);
</script>