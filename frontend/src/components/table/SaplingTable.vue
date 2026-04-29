<template>
  <v-skeleton-loader
    v-if="showInitialSkeleton"
    class="mx-auto fill-height glass-panel"
    elevation="12"
    type="article, actions, table"
    width="100%"
  />
  <div
    v-else
    class="sapling-table-root"
    :class="{
      'sapling-table-root--has-select': Boolean(multiSelect),
      'sapling-table-root--has-actions': Boolean(showActions),
    }"
  >
    <div
      class="sapling-table-toolbar transparent"
      :class="{ 'sapling-table-toolbar--mobile': isMobileTable }"
    >
      <div class="sapling-table-toolbar-controls">
        <div
          v-if="multiSelect"
          class="sapling-table-toolbar-slot sapling-table-toolbar-slot--selection"
        >
          <SaplingTableMultiSelect
            :multiSelect="multiSelect"
            :selectedRows="selectedRows"
            :script-buttons="multiSelectScriptButtons"
            :showActions="showActions"
            :entity="entity"
            :entity-permission="entityPermission"
            @clearSelection="clearSelection"
            @deleteAllSelected="deleteAllSelected"
            @exportSelected="exportSelectedJSON"
            @runScriptButton="runSelectionScriptButton"
            @selectAll="selectAllRows"
          />
        </div>

        <div class="sapling-table-toolbar-slot sapling-table-toolbar-slot--search">
          <SaplingSearch
            class="sapling-table-toolbar-search"
            :model-value="search ?? ''"
            :entity="entity"
            @update:model-value="onSearchUpdate"
          />
        </div>

        <div class="sapling-table-toolbar-slot sapling-table-toolbar-slot--actions">
          <div
            class="sapling-table-toolbar-actions"
            :class="{ 'sapling-table-toolbar-actions--compact': !showToolbarActionsInline }"
          >
            <template v-if="isMobileTable">
              <v-btn
                class="sapling-table-toolbar-action sapling-table-toolbar-action--icon-only sapling-table-toolbar-action--download"
                color="primary"
                variant="tonal"
                icon
                rounded="pill"
                :title="$t('global.download')"
                :aria-label="$t('global.download')"
                @click="downloadJSON"
              >
                <v-icon>mdi-download</v-icon>
              </v-btn>
              <v-btn
                v-if="entity?.canInsert && entityPermission?.allowInsert"
                class="sapling-table-toolbar-action sapling-table-toolbar-action--icon-only sapling-table-toolbar-action--add"
                color="primary"
                variant="flat"
                icon
                rounded="pill"
                :title="$t('global.add')"
                :aria-label="$t('global.add')"
                @click="openCreateDialog"
              >
                <v-icon>mdi-plus</v-icon>
              </v-btn>
            </template>
            <template v-else>
              <v-btn
                class="sapling-table-toolbar-action sapling-table-toolbar-action--download"
                color="primary"
                variant="tonal"
                prepend-icon="mdi-download"
                rounded="pill"
                :title="$t('global.download')"
                :aria-label="$t('global.download')"
                @click="downloadJSON"
              >
                {{ $t('global.download') }}
              </v-btn>
              <v-btn
                v-if="entity?.canInsert && entityPermission?.allowInsert"
                class="sapling-table-toolbar-action sapling-table-toolbar-action--add"
                color="primary"
                variant="flat"
                prepend-icon="mdi-plus"
                rounded="pill"
                :title="$t('global.add')"
                :aria-label="$t('global.add')"
                @click="openCreateDialog"
              >
                {{ $t('global.add') }}
              </v-btn>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div ref="tableContainerRef" class="sapling-table-body">
      <SaplingTableMobileView
        v-if="isMobileTable"
        :items="items"
        :total-items="totalItems"
        :items-per-page="itemsPerPage"
        :page="page"
        :is-loading="isLoading"
        :search="search ?? ''"
        :mobile-card-headers="mobileCardHeaders"
        :multi-select="multiSelect"
        :entity="entity"
        :entity-permission="entityPermission"
        :entity-templates="entityTemplates"
        :entity-handle="entityHandle"
        :row-script-buttons="rowScriptButtons"
        :can-navigate="canNavigate"
        :can-show-information="canShowInformation"
        :show-actions="showActions"
        :selected-rows="selectedRows"
        :selected-row="selectedRow"
        :is-header-translation-loading="isHeaderTranslationLoading"
        :get-column-sort-icon="getColumnSortIcon"
        :is-column-filterable="isColumnFilterable"
        :get-column-filter-item="getColumnFilterItem"
        :get-filter-operator-options="getFilterOperatorOptions"
        @update:page="onPageUpdate"
        @toggle-column-sort="toggleColumnSort"
        @update:column-filter="({ key, value }) => onColumnFilterChange(key, value)"
        @select-row="selectRow"
        @delete="openDeleteDialog"
        @edit="openEditDialog"
        @show="openShowDialog"
        @copy="openCopyDialog"
        @favorite="openFavoriteDialog"
        @script="runRowScriptButton"
        @navigate="navigateToAddress"
        @timeline="openTimeline"
        @upload-document="openUploadDialog"
        @show-documents="navigateToDocuments"
        @show-information="openInformationDialog"
      />
      <SaplingTableDesktopView
        v-else
        :table-key="tableKey"
        :items="items"
        :total-items="totalItems"
        :items-per-page="itemsPerPage"
        :page="page"
        :is-loading="isLoading"
        :sort-by="sortBy"
        :visible-headers="visibleHeaders"
        :multi-select="multiSelect"
        :entity="entity"
        :entity-permission="entityPermission"
        :entity-templates="entityTemplates"
        :entity-handle="entityHandle"
        :row-script-buttons="rowScriptButtons"
        :can-navigate="canNavigate"
        :can-show-information="canShowInformation"
        :show-actions="showActions"
        :selected-rows="selectedRows"
        :selected-row="selectedRow"
        :is-header-translation-loading="isHeaderTranslationLoading"
        :get-column-filter-item="getColumnFilterItem"
        :get-filter-operator-options="getFilterOperatorOptions"
        :is-column-filterable="isColumnFilterable"
        @update:page="onPageUpdate"
        @update:items-per-page="onItemsPerPageUpdate"
        @update:sort-by="onSortByUpdate"
        @update:column-filter="({ key, value }) => onColumnFilterChange(key, value)"
        @select-row="selectRow"
        @delete="openDeleteDialog"
        @edit="openEditDialog"
        @show="openShowDialog"
        @copy="openCopyDialog"
        @favorite="openFavoriteDialog"
        @script="runRowScriptButton"
        @navigate="navigateToAddress"
        @timeline="openTimeline"
        @upload-document="openUploadDialog"
        @show-documents="navigateToDocuments"
        @show-information="openInformationDialog"
        @open-context-menu="openContextMenu"
      />
    </div>

    <SaplingTableOverlays
      :entity="entity"
      :entity-handle="entityHandle"
      :entity-permission="entityPermission"
      :entity-templates="entityTemplates"
      :parent="parent"
      :parent-entity="parentEntity"
      :row-script-buttons="rowScriptButtons"
      :can-navigate="canNavigate"
      :can-show-information="canShowInformation"
      :edit-dialog="editDialog"
      :delete-dialog="deleteDialog"
      :bulk-delete-dialog="bulkDeleteDialog"
      :context-menu="contextMenu"
      :show-upload-dialog="showUploadDialog"
      :upload-dialog-item="uploadDialogItem"
      :show-information-dialog="showInformationDialog"
      :information-dialog-item="informationDialogItem"
      @update:delete-visible="(value) => (deleteDialog.visible = value)"
      @confirm-delete="confirmDelete"
      @close-delete="closeDeleteDialog"
      @update:bulk-delete-visible="(value) => (bulkDeleteDialog.visible = value)"
      @confirm-bulk-delete="confirmBulkDelete"
      @close-bulk-delete="closeBulkDeleteDialog"
      @update:edit-visible="(value) => (editDialog.visible = value)"
      @save-dialog="saveDialog"
      @close-dialog="closeDialog"
      @update:edit-mode="editDialog.mode = $event"
      @update:edit-item="editDialog.item = $event"
      @context-action="onContextMenuAction"
      @update:context-visible="(value) => (contextMenu.visible = value)"
      @close-upload="closeUploadDialog"
      @close-information="closeInformationDialog"
    />

    <SaplingTableFavoriteDialog
      :model-value="favoriteDialog.visible"
      :title="favoriteDialog.title"
      @update:model-value="(value) => (favoriteDialog.visible = value)"
      @update:title="favoriteDialog.title = $event"
      @save="saveFavorite"
      @cancel="closeFavoriteDialog"
    />
  </div>
</template>

<script lang="ts" setup>
// #region Imports
import { computed, ref, watch } from 'vue'
import SaplingSearch from '@/components/system/SaplingSearch.vue'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import SaplingTableDesktopView from './SaplingTableDesktopView.vue'
import SaplingTableFavoriteDialog from './SaplingTableFavoriteDialog.vue'
import SaplingTableMobileView from './SaplingTableMobileView.vue'
import SaplingTableMultiSelect from './SaplingTableMultiSelect.vue'
import SaplingTableOverlays from './SaplingTableOverlays.vue'
import {
  useSaplingTableComponent,
  type UseSaplingTableEmit,
  type UseSaplingTableProps,
} from '@/composables/table/useSaplingTableComponent'
// #endregion

// #region Props and Emits
const props = defineProps<UseSaplingTableProps>()
const emit = defineEmits<UseSaplingTableEmit>()
const { isLoading: isHeaderTranslationLoading } = useTranslationLoader(props.entityHandle)

const hasCompletedInitialLoad = ref(!props.isLoading)

watch(
  () => props.isLoading,
  (isLoading) => {
    if (!isLoading) {
      hasCompletedInitialLoad.value = true
    }
  },
  { immediate: true },
)

watch(
  () => props.tableKey,
  () => {
    hasCompletedInitialLoad.value = !props.isLoading
  },
)

const showInitialSkeleton = computed(() => !hasCompletedInitialLoad.value)
// #endregion

// #region Composable
const {
  tableContainerRef,
  selectedRows,
  selectedRow,
  visibleHeaders,
  mobileCardHeaders,
  canNavigate,
  canShowInformation,
  editDialog,
  deleteDialog,
  bulkDeleteDialog,
  showUploadDialog,
  uploadDialogItem,
  showInformationDialog,
  informationDialogItem,
  contextMenu,
  favoriteDialog,
  multiSelectScriptButtons,
  rowScriptButtons,
  onSearchUpdate,
  onPageUpdate,
  onItemsPerPageUpdate,
  onSortByUpdate,
  toggleColumnSort,
  getColumnSortIcon,
  onColumnFilterChange,
  getColumnFilterItem,
  getFilterOperatorOptions,
  isColumnFilterable,
  showToolbarActionsInline,
  isMobileTable,
  downloadJSON,
  exportSelectedJSON,
  openContextMenu,
  onContextMenuAction,
  selectAllRows,
  selectRow,
  clearSelection,
  deleteAllSelected,
  confirmBulkDelete,
  closeBulkDeleteDialog,
  runSelectionScriptButton,
  runRowScriptButton,
  navigateToAddress,
  openTimeline,
  openUploadDialog,
  closeUploadDialog,
  navigateToDocuments,
  openInformationDialog,
  closeInformationDialog,
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
} = useSaplingTableComponent(props, emit)
// #endregion
</script>
