<template>
  <v-card flat style="height: 100%;">
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
          style="flex: 1;"
        />
        <v-btn icon color="primary" @click="openCreateDialog">
          <v-icon>mdi-plus</v-icon>
        </v-btn>
      </div>
    </template>
    <v-skeleton-loader
      v-if="isLoading"
      class="mx-auto"
      elevation="12"
      type="article, actions"/>
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
        <template #item="{ item, columns, index }">
          <tr
            :class="{ 'selected-row': selectedRow === index }"
            @click="selectRow(index)"
            style="cursor: pointer;">
            <td v-for="col in columns" :key="col.key ?? ''" :class="{ 'actions-cell': col.key === '__actions' }">
              <template v-if="col.key === '__actions'">
                <div class="actions-wrapper">
                  <v-btn icon size="small" @click.stop="openEditDialog(item)"><v-icon>mdi-pencil</v-icon></v-btn>
                  <v-btn icon size="small" color="error" @click.stop="openDeleteDialog(item)"><v-icon>mdi-delete</v-icon></v-btn>
                </div>
              </template>
              <template v-else>
                {{ format(item[col.key || ''], (col as EntityTableHeader).type) }}
              </template>
            </td>
          </tr>
        </template>
      </v-data-table-server>
    </template>

    <!-- Dialog für Erstellen/Bearbeiten -->
    <v-dialog v-model="dialog.visible" max-width="600">
      <v-card>
        <v-card-title>
          {{ dialog.mode === 'edit' ? 'Datensatz bearbeiten' : 'Neuen Datensatz anlegen' }}
        </v-card-title>
        <v-card-text>
          <!-- Formularfelder hier einfügen -->
          <div style="min-height: 100px;">Formular folgt ...</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="closeDialog">Abbrechen</v-btn>
          <v-btn color="primary" @click="saveDialog">Speichern</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Bestätigungsdialog für Löschen -->
    <v-dialog v-model="deleteDialog.visible" max-width="400">
      <v-card>
        <v-card-title>Löschen bestätigen</v-card-title>
        <v-card-text>
          Möchtest du diesen Datensatz wirklich löschen?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="closeDeleteDialog">Abbrechen</v-btn>
          <v-btn color="error" @click="confirmDelete">Löschen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';

type EntityTableHeader = {
  key: string;
  title: string;
  type?: string;
  [key: string]: any;
};

type SortItem = { key: string; order?: 'asc' | 'desc' };

const props = defineProps<{
  headers: EntityTableHeader[],
  items: any[],
  search: string,
  page: number,
  itemsPerPage: number,
  totalItems: number,
  isLoading: boolean,
  sortBy: SortItem[]
}>();

const emit = defineEmits([
  'update:search',
  'update:page',
  'update:itemsPerPage',
  'update:sortBy'
]);

const localSearch = ref(props.search);

watch(() => props.search, (val) => {
  localSearch.value = val;
});

function onSearchUpdate(val: string) {
  localSearch.value = val;
  emit('update:search', val);
}

function onPageUpdate(val: number) {
  emit('update:page', val);
}

function onItemsPerPageUpdate(val: number) {
  emit('update:itemsPerPage', val);
}

function onSortByUpdate(val: SortItem[]) {
  emit('update:sortBy', val);
}

function format(value: string, type?: string): string {
  switch (type) {
    case 'datetime':
    case 'datetype':
    case 'date':
      return formatDate(value, type);
    default:
      return value;
  }
}

function formatDate(value: string | Date, type?: string): string {
  const date = new Date(value);
  switch (type) {
    case 'datetime':
      return date.toLocaleString();
    default:
      return date.toLocaleDateString();
  }
}

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


const selectedRow = ref<number | null>(null);

function selectRow(index: number) {
  selectedRow.value = index;
}

// CRUD Dialog State
const dialog = ref<{ visible: boolean; mode: 'create' | 'edit'; item: any | null }>({ visible: false, mode: 'create', item: null });
const deleteDialog = ref<{ visible: boolean; item: any | null }>({ visible: false, item: null });

function openCreateDialog() {
  dialog.value = { visible: true, mode: 'create', item: null };
}
function openEditDialog(item: any) {
  dialog.value = { visible: true, mode: 'edit', item };
}
function closeDialog() {
  dialog.value.visible = false;
}
function saveDialog() {
  // Hier später Save-Logik einbauen
  closeDialog();
}

function openDeleteDialog(item: any) {
  deleteDialog.value = { visible: true, item };
}
function closeDeleteDialog() {
  deleteDialog.value.visible = false;
}
function confirmDelete() {
  // Hier später Delete-Logik einbauen
  closeDeleteDialog();
}

// Action-Header für Edit/Delete
const actionHeaders = computed(() => [
  ...props.headers,
  { key: '__actions', title: '', sortable: false }
]);
</script>

<style scoped>
.selected-row {
  background-color: #e0e0e01a;
}

.actions-cell {
  text-align: right;
}
.actions-wrapper {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}
</style>