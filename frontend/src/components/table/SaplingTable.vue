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
      class="sapling-toolbar-shell sapling-table-toolbar"
      :class="{ 'sapling-table-toolbar--mobile': isMobileTable }"
    >
      <div class="sapling-toolbar-controls sapling-table-toolbar-controls">
        <div
          v-if="multiSelect"
          class="sapling-toolbar-slot sapling-table-toolbar-slot sapling-table-toolbar-slot--selection"
        >
          <SaplingTableMultiSelect
            :multiSelect="multiSelect"
            :selectedRows="selectedRows"
            :selected-items="selectedItems"
            :entity-templates="entityTemplates"
            :script-buttons="multiSelectScriptButtons"
            :showActions="showActions"
            :entity="entity"
            :entity-permission="entityPermission"
            @clearSelection="clearSelection"
            @deleteAllSelected="deleteAllSelected"
            @exportSelected="exportSelectedJSON"
            @runScriptButton="runSelectionScriptButton"
            @selectAll="selectAllRows"
            @mailToSelected="onMailToSelected"
          />
        </div>

        <div
          v-if="showSearchField"
          class="sapling-toolbar-slot sapling-toolbar-slot--grow sapling-table-toolbar-slot sapling-table-toolbar-slot--search"
        >
          <SaplingSearch
            class="sapling-table-toolbar-search"
            :model-value="search ?? ''"
            :entity="entity"
            @update:model-value="onSearchUpdate"
          />
        </div>

        <div
          class="sapling-toolbar-slot sapling-toolbar-slot--trailing sapling-table-toolbar-slot sapling-table-toolbar-slot--actions"
        >
          <div
            class="sapling-action-cluster sapling-table-toolbar-actions"
            :class="{ 'sapling-table-toolbar-actions--compact': !showToolbarActionsInline }"
          >
            <SaplingTableToolbarActions
              :is-mobile-table="isMobileTable"
              :is-downloading-json="isDownloadingJSON"
              :is-importing-csv="isImportingCSV"
              :refresh-button-label="refreshButtonLabel"
              :show-favorite="showFavoriteButton"
              :show-import="showImportButton"
              :show-add="showAddButton"
              :favorite-items="currentEntityFavorites"
              :is-favorites-loading="isCurrentEntityFavoritesLoading"
              :active-favorite-handle="activeFavoriteHandle"
              @download-json="downloadJSON"
              @download-csv="exportCSV"
              @download-csv-template="exportCSVTemplate"
              @import-csv="openImportFilePicker"
              @refresh="refreshTable"
              @favorite="openFavoriteDialog"
              @select-favorite="selectFavorite"
              @add="openCreateDialog"
            >
              <template v-if="showSidePanelToggleButton || showFormConfigButton" #leading>
                <v-btn
                  v-if="showSidePanelToggleButton"
                  class="sapling-table-toolbar-action sapling-table-toolbar-action--icon-only sapling-table-toolbar-action--utility"
                  color="primary"
                  :variant="sidePanelVisible ? 'flat' : 'tonal'"
                  icon
                  :title="sidePanelToggleLabel"
                  :aria-label="sidePanelToggleLabel"
                  @click="emit('toggleSidePanel')"
                >
                  <v-icon>{{ sidePanelToggleIcon }}</v-icon>
                </v-btn>
                <v-btn
                  v-if="showFormConfigButton"
                  class="sapling-table-toolbar-action sapling-table-toolbar-action--icon-only sapling-table-toolbar-action--utility"
                  color="primary"
                  variant="tonal"
                  icon
                  :title="$t('formConfig.openForEntity')"
                  :aria-label="$t('formConfig.openForEntity')"
                  @click="openFormConfigForTable"
                >
                  <v-icon>mdi-table-cog</v-icon>
                </v-btn>
              </template>
            </SaplingTableToolbarActions>
          </div>
        </div>
      </div>
    </div>

    <input
      ref="importInputRef"
      class="sapling-upload-native-input"
      type="file"
      accept=".csv,.txt,.tsv,text/csv,text/plain"
      @change="onImportFileInputChange"
    />

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
        @change-log="openChangeLog"
        @delete="openDeleteDialog"
        @edit="openEditDialog"
        @show="openShowDialog"
        @copy="openCopyDialog"
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
        @change-log="openChangeLog"
        @delete="openDeleteDialog"
        @edit="openEditDialog"
        @show="openShowDialog"
        @copy="openCopyDialog"
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
      :update-conflict-dialog="updateConflictDialog"
      :context-menu="{ ...contextMenu, visible: showActions && contextMenu.visible }"
      :context-menu-mail-actions="contextMenuMailActions"
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
      @record-deleted="refreshTable"
      @close-update-conflict="closeUpdateConflictDialog"
      @merge-update-conflict="mergeUpdateConflict"
      @reload-update-conflict="reloadUpdateConflictRecord"
      @open-update-conflict-change-log="openUpdateConflictChangeLog"
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
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import SaplingSearch from '@/components/system/SaplingSearch.vue'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import { useSaplingMailDialog } from '@/composables/dialog/useSaplingMailDialog'
import type { SaplingBulkMailAction } from '@/utils/saplingMailMenuUtil'
import SaplingTableDesktopView from './SaplingTableDesktopView.vue'
import SaplingTableFavoriteDialog from './SaplingTableFavoriteDialog.vue'
import SaplingTableMobileView from './SaplingTableMobileView.vue'
import SaplingTableMultiSelect from './SaplingTableMultiSelect.vue'
import SaplingTableOverlays from './SaplingTableOverlays.vue'
import SaplingTableToolbarActions from './SaplingTableToolbarActions.vue'
import {
  useSaplingTableComponent,
  type UseSaplingTableEmit,
  type UseSaplingTableProps,
} from '@/composables/table/useSaplingTableComponent'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
// #endregion

// #region Props and Emits
type SaplingTableProps = UseSaplingTableProps & {
  showFavorite?: boolean
  showAdd?: boolean
  showSearch?: boolean
  showSidePanelToggle?: boolean
  sidePanelVisible?: boolean
  sidePanelToggleLabel?: string
  sidePanelToggleIcon?: string
}

type SaplingTableEmit = UseSaplingTableEmit & {
  (event: 'toggleSidePanel'): void
}

const props = withDefaults(defineProps<SaplingTableProps>(), {
  showSearch: true,
})
const emit = defineEmits<SaplingTableEmit>()
const { t } = useI18n()
const router = useRouter()
const { isLoading: isHeaderTranslationLoading } = useTranslationLoader(props.entityHandle)
const currentPersonStore = useCurrentPersonStore()

const hasCompletedInitialLoad = ref(!props.isLoading)
const importInputRef = ref<HTMLInputElement | null>(null)

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
const refreshButtonLabel = computed(() => t('global.refresh'))
const showFavoriteButton = computed(() => props.showFavorite !== false)
const showAddButton = computed(
  () =>
    props.showAdd !== false &&
    Boolean(props.entity?.canInsert) &&
    Boolean(props.entityPermission?.allowInsert),
)
const showImportButton = computed(
  () =>
    currentPersonStore.isAdministrator &&
    (Boolean(props.entityPermission?.allowInsert) || Boolean(props.entityPermission?.allowUpdate)),
)
const showFormConfigButton = computed(
  () => currentPersonStore.isAdministrator && Boolean(props.entityHandle),
)
const showSearchField = computed(() => props.showSearch !== false)
const showSidePanelToggleButton = computed(() => props.showSidePanelToggle === true)
const sidePanelVisible = computed(() => props.sidePanelVisible === true)
const sidePanelToggleLabel = computed(
  () => props.sidePanelToggleLabel?.trim() || t('global.filter'),
)
const sidePanelToggleIcon = computed(
  () => props.sidePanelToggleIcon?.trim() || 'mdi-account-group-outline',
)

onMounted(() => {
  void currentPersonStore.fetchCurrentPerson()
})
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
  updateConflictDialog,
  showUploadDialog,
  uploadDialogItem,
  showInformationDialog,
  informationDialogItem,
  contextMenu,
  contextMenuMailActions,
  selectedItems,
  favoriteDialog,
  currentEntityFavorites,
  isCurrentEntityFavoritesLoading,
  activeFavoriteHandle,
  isDownloadingJSON,
  isImportingCSV,
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
  exportCSV,
  exportCSVTemplate,
  importCSVFile,
  refreshTable,
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
  openChangeLog,
  openUploadDialog,
  closeUploadDialog,
  navigateToDocuments,
  openInformationDialog,
  closeInformationDialog,
  openFavoriteDialog,
  closeFavoriteDialog,
  saveFavorite,
  selectFavorite,
  openCreateDialog,
  openEditDialog,
  openShowDialog,
  openCopyDialog,
  closeDialog,
  saveDialog,
  closeUpdateConflictDialog,
  openUpdateConflictChangeLog,
  reloadUpdateConflictRecord,
  mergeUpdateConflict,
  confirmDelete,
  openDeleteDialog,
  closeDeleteDialog,
} = useSaplingTableComponent(props, emit)

const { openMailDialog } = useSaplingMailDialog()

function onMailToSelected(action: SaplingBulkMailAction): void {
  if (action.emails.length === 0) {
    return
  }

  openMailDialog({
    entityHandle: props.entityHandle,
    initialTo: action.emails,
  })
}

function openImportFilePicker(): void {
  importInputRef.value?.click()
}

async function openFormConfigForTable(): Promise<void> {
  if (!props.entityHandle) {
    return
  }

  await router.push({ name: 'formConfig', query: { entity: props.entityHandle } })
}

function onImportFileInputChange(event: Event): void {
  const target = event.target as HTMLInputElement | null
  const file = target?.files?.[0] ?? null
  void importCSVFile(file)

  if (target) {
    target.value = ''
  }
}
// #endregion
</script>
