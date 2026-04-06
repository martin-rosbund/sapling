<template>
  <v-skeleton-loader
    v-if="isLoading"
    class="mx-auto fill-height glass-panel"
    elevation="12"
    type="article, actions, table"
  />
  <template v-else>
    <div class="sapling-table-toolbar">
      <div class="sapling-table-toolbar-controls">
        <SaplingTableMultiSelect
          v-if="multiSelect"
          :multiSelect="multiSelect"
          :selectedRows="selectedRows"
          :showActions="showActions"
          :entity="entity"
          :entity-permission="entityPermission"
          @clearSelection="clearSelection"
          @deleteAllSelected="deleteAllSelected"
          @exportSelected="exportSelectedJSON"
          @selectAll="selectAllRows"
        />

        <SaplingSearch
          class="sapling-table-toolbar-search"
          :model-value="search ?? ''"
          :entity="entity"
          @update:model-value="onSearchUpdate"
        />

        <v-btn-group v-if="showToolbarActionsInline" class="sapling-table-toolbar-actions" density="compact">
          <v-btn
            class="sapling-table-toolbar-icon-btn"
            color="primary"
            variant="text"
            icon="mdi-download"
            :title="$t('global.download')"
            :aria-label="$t('global.download')"
            @click="downloadJSON"
          />
          <v-btn
            v-if="entity?.canInsert && entityPermission?.allowInsert"
            class="sapling-table-toolbar-icon-btn"
            color="primary"
            variant="text"
            icon="mdi-plus"
            :title="$t('global.add')"
            :aria-label="$t('global.add')"
            @click="openCreateDialog"
          />
        </v-btn-group>

        <v-menu v-else location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn
              class="sapling-table-toolbar-menu-btn"
              v-bind="menuProps"
              variant="text"
              icon="mdi-dots-vertical"
              aria-label="Table actions"
              title="Table actions"
            />
          </template>
          <v-list class="glass-panel">
            <v-list-item @click="downloadJSON">
              <template #prepend>
                <v-icon>mdi-download</v-icon>
              </template>
              <v-list-item-title>{{ $t('global.download') }}</v-list-item-title>
            </v-list-item>
            <v-list-item v-if="entity?.canInsert && entityPermission?.allowInsert" @click="openCreateDialog">
              <template #prepend>
                <v-icon>mdi-plus</v-icon>
              </template>
              <v-list-item-title>{{ $t('global.add') }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>

    <div ref="tableContainerRef">
      <v-data-table-server
        :key="tableKey"
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
            <template v-for="column in columns" :key="String(column.key ?? column.title ?? '')">
              <th class="sapling-table-header-cell">
                <template v-if="column.key === '__actions'">
                  <span></span>
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
                      @update:filter="(value) => onColumnFilterChange(String(column.key ?? ''), value)"
                      @sort="toggleSort(column)"
                    />
                  </div>
                </template>
                <template v-else>
                  <button class="sapling-table-header-button" type="button" @click="toggleSort(column)">
                    <span>{{ column.title }}</span>
                    <v-icon v-if="isSorted(column)" size="small">{{ getSortIcon(column) }}</v-icon>
                  </button>
                </template>
              </th>
            </template>
          </tr>
        </template>

        <template #item="{ item, index }">
          <SaplingTableRow
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
            @favorite="openFavoriteDialog"
          />
        </template>
      </v-data-table-server>
    </div>

    <SaplingDialogDelete
      persistent
      :model-value="deleteDialog.visible"
      :item="deleteDialog.item"
      @update:model-value="(value) => deleteDialog.visible = value"
      @confirm="confirmDelete"
      @cancel="closeDeleteDialog"
    />

    <SaplingDialogDelete
      persistent
      :model-value="bulkDeleteDialog.visible"
      :item="bulkDeleteDialog.items"
      @update:model-value="(value) => bulkDeleteDialog.visible = value"
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
      @update:model-value="(value) => editDialog.visible = value"
      @save="saveDialog"
      @cancel="closeDialog"
      @update:mode="editDialog.mode = $event"
      @update:item="editDialog.item = $event"
    />

    <v-dialog :model-value="favoriteDialog.visible" max-width="500" @update:model-value="(value) => favoriteDialog.visible = value">
      <v-card class="glass-panel">
        <v-card-title>{{ $t('global.add') }} {{ $t('navigation.favorite') }}</v-card-title>
        <v-card-text>
          <v-form ref="favoriteFormRef">
            <v-text-field
              v-model="favoriteDialog.title"
              :label="$t('favorite.title') + '*'"
              :rules="[value => !!String(value ?? '').trim() || $t('favorite.title') + ' ' + $t('global.isRequired')]"
              required
            />
          </v-form>
        </v-card-text>
        <SaplingActionSave :cancel="closeFavoriteDialog" :save="saveFavorite" />
      </v-card>
    </v-dialog>
  </template>
</template>

<script lang="ts" setup>
// #region Imports
import { defineAsyncComponent } from 'vue';
import { DEFAULT_PAGE_SIZE_OPTIONS } from '@/constants/project.constants';
import SaplingActionSave from '@/components/actions/SaplingActionSave.vue';
import SaplingDialogEdit from '@/components/dialog/SaplingDialogEdit.vue';
import SaplingDialogDelete from '@/components/dialog/SaplingDialogDelete.vue';
import SaplingSearch from '@/components/system/SaplingSearch.vue';
import SaplingTableMultiSelect from './SaplingTableMultiSelect.vue';
import SaplingTableColumnFilter from './filter/SaplingTableColumnFilter.vue';
import {
  useSaplingTableComponent,
  type UseSaplingTableEmit,
  type UseSaplingTableProps,
} from '@/composables/table/useSaplingTableComponent';
// #endregion

// #region Async Components
const SaplingTableRow = defineAsyncComponent(() => import('./SaplingTableRow.vue'));
// #endregion

// #region Props and Emits
const props = defineProps<UseSaplingTableProps>();
const emit = defineEmits<UseSaplingTableEmit>();
// #endregion

// #region Composable
const {
  tableContainerRef,
  selectedRows,
  selectedRow,
  visibleHeaders,
  editDialog,
  deleteDialog,
  bulkDeleteDialog,
  favoriteDialog,
  favoriteFormRef,
  onSearchUpdate,
  onPageUpdate,
  onItemsPerPageUpdate,
  onSortByUpdate,
  onColumnFilterChange,
  getColumnFilterItem,
  getFilterOperatorOptions,
  isColumnFilterable,
  showToolbarActionsInline,
  downloadJSON,
  exportSelectedJSON,
  selectAllRows,
  selectRow,
  clearSelection,
  deleteAllSelected,
  confirmBulkDelete,
  closeBulkDeleteDialog,
  openFavoriteDialog,
  closeFavoriteDialog,
  saveFavorite,
  openCreateDialog,
  openEditDialog,
  openShowDialog,
  openCopyDialog,
  closeDialog,
  saveDialog,
  confirmDelete,
  openDeleteDialog,
  closeDeleteDialog,
} = useSaplingTableComponent(props, emit);
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingTable.css"></style>