<template>
  <v-skeleton-loader
    v-if="showInitialSkeleton"
    class="mx-auto fill-height glass-panel"
    elevation="12"
    type="article, actions, table"
  />
  <div
    v-else
    class="sapling-table-root"
    :class="{
      'sapling-table-root--has-select': Boolean(multiSelect),
      'sapling-table-root--has-actions': Boolean(showActions),
    }"
  >
    <div class="sapling-table-toolbar">
      <div class="sapling-table-toolbar-controls">
        <SaplingTableMultiSelect
          v-if="multiSelect"
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

        <SaplingSearch
          class="sapling-table-toolbar-search"
          :model-value="search ?? ''"
          :entity="entity"
          @update:model-value="onSearchUpdate"
        />

        <v-btn-group
          v-if="showToolbarActionsInline"
          class="sapling-table-toolbar-actions"
          density="compact"
        >
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
              :aria-label="$t('global.tableActions')"
              :title="$t('global.tableActions')"
            />
          </template>
          <v-list class="glass-panel">
            <v-list-item @click="downloadJSON">
              <template #prepend>
                <v-icon>mdi-download</v-icon>
              </template>
              <v-list-item-title>{{ $t('global.download') }}</v-list-item-title>
            </v-list-item>
            <v-list-item
              v-if="entity?.canInsert && entityPermission?.allowInsert"
              @click="openCreateDialog"
            >
              <template #prepend>
                <v-icon>mdi-plus</v-icon>
              </template>
              <v-list-item-title>{{ $t('global.add') }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>

    <div ref="tableContainerRef" class="sapling-table-body">
      <div v-if="isMobileTable" class="sapling-table-mobile-shell">
        <div class="sapling-table-mobile-summary">
          <div class="sapling-table-mobile-summary__header">
            <div class="sapling-table-mobile-summary__header-stats">
              <span class="sapling-table-mobile-summary__chip">
                <v-icon size="small">mdi-format-list-bulleted</v-icon>
                <span>{{ totalItems }} {{ $t('global.items') }}</span>
              </span>
              <span
                v-if="selectedRows.length > 0"
                class="sapling-table-mobile-summary__chip sapling-table-mobile-summary__chip--active"
              >
                <v-icon size="small">mdi-check-circle-outline</v-icon>
                <span>{{ selectedRows.length }}</span>
              </span>
            </div>

            <div class="sapling-table-mobile-summary__actions">
              <v-btn
                class="sapling-table-mobile-summary__toggle-btn"
                variant="text"
                size="small"
                :title="$t('global.sortAndFilter')"
                :aria-label="$t('global.sortAndFilter')"
                @click="mobileControlsVisible = !mobileControlsVisible"
              >
                <v-icon size="small">mdi-tune-variant</v-icon></v-btn
              >
            </div>
          </div>

          <div v-if="(search ?? '').trim().length > 0" class="sapling-table-mobile-summary__stats">
            <span
              v-if="(search ?? '').trim().length > 0"
              class="sapling-table-mobile-summary__chip"
            >
              <v-icon size="small">mdi-magnify</v-icon>
              <span>{{ search }}</span>
            </span>
          </div>
          <v-progress-linear v-if="isLoading" color="primary" indeterminate rounded />
        </div>

        <div v-if="mobileControlsVisible" class="sapling-table-mobile-controls glass-panel">
          <div class="sapling-table-mobile-controls__sorts">
            <v-btn
              v-for="column in mobileCardHeaders"
              :key="`sort-${String(column.key ?? '')}`"
              class="sapling-table-mobile-controls__sort-btn"
              variant="text"
              size="small"
              @click="toggleColumnSort(String(column.key ?? ''))"
            >
              <span>{{ column.title }}</span>
              <v-icon size="small">{{ getColumnSortIcon(String(column.key ?? '')) }}</v-icon>
            </v-btn>
          </div>

          <div
            v-if="mobileCardHeaders.some((column) => isColumnFilterable(column))"
            class="sapling-table-mobile-controls__filters"
          >
            <SaplingTableColumnFilter
              v-for="column in mobileCardHeaders.filter((item) => isColumnFilterable(item))"
              :key="`filter-${String(column.key ?? '')}`"
              :column="column"
              :filter-item="getColumnFilterItem(String(column.key ?? ''))"
              :title="String(column.title ?? '')"
              :operator-options="getFilterOperatorOptions(column)"
              :sort-icon="getColumnSortIcon(String(column.key ?? ''))"
              @update:filter="(value) => onColumnFilterChange(String(column.key ?? ''), value)"
              @sort="toggleColumnSort(String(column.key ?? ''))"
            />
          </div>
        </div>

        <div v-if="items.length > 0" class="sapling-table-mobile-list">
          <SaplingTableMobileCard
            v-for="(item, index) in items"
            :key="String(item.handle ?? index)"
            :item="item"
            :columns="mobileCardHeaders"
            :index="index"
            :selected-row="selectedRow"
            :selected-rows="selectedRows"
            :multi-select="multiSelect"
            :entity="entity"
            :entity-permission="entityPermission"
            :entity-templates="entityTemplates"
            :entity-handle="entityHandle"
            :script-buttons="rowScriptButtons"
            :show-actions="showActions"
            @select-row="selectRow"
            @delete="openDeleteDialog"
            @edit="openEditDialog"
            @show="openShowDialog"
            @copy="openCopyDialog"
            @favorite="openFavoriteDialog"
            @script="runRowScriptButton"
          />
        </div>

        <section
          v-else-if="!isLoading"
          class="sapling-empty-state-panel sapling-table-mobile-empty-state glass-panel"
        >
          <v-icon size="48">mdi-table-search</v-icon>
          <span class="sapling-eyebrow">{{ entity?.title ?? entityHandle }}</span>
          <p>{{ $t('global.noData') }}</p>
        </section>

        <v-pagination
          v-if="totalItems > itemsPerPage"
          :model-value="page"
          :length="Math.max(1, Math.ceil(totalItems / itemsPerPage))"
          :total-visible="5"
          density="comfortable"
          rounded="circle"
          @update:model-value="onPageUpdate"
        />
      </div>

      <v-data-table-server
        v-else
        :key="tableKey"
        density="compact"
        fixed-header
        height="100%"
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
              <th :class="getHeaderCellClasses(column)">
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
                      @update:filter="
                        (value) => onColumnFilterChange(String(column.key ?? ''), value)
                      "
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
            :script-buttons="rowScriptButtons"
            :show-actions="showActions"
            @select-row="selectRow"
            @delete="openDeleteDialog"
            @edit="openEditDialog"
            @show="openShowDialog"
            @copy="openCopyDialog"
            @favorite="openFavoriteDialog"
            @script="runRowScriptButton"
          />
        </template>
      </v-data-table-server>
    </div>

    <SaplingDialogDelete
      persistent
      :model-value="deleteDialog.visible"
      :item="deleteDialog.item"
      @update:model-value="(value) => (deleteDialog.visible = value)"
      @confirm="confirmDelete"
      @cancel="closeDeleteDialog"
    />

    <SaplingDialogDelete
      persistent
      :model-value="bulkDeleteDialog.visible"
      :item="bulkDeleteDialog.items"
      @update:model-value="(value) => (bulkDeleteDialog.visible = value)"
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
      @update:model-value="(value) => (editDialog.visible = value)"
      @save="saveDialog"
      @cancel="closeDialog"
      @update:mode="editDialog.mode = $event"
      @update:item="editDialog.item = $event"
    />

    <v-dialog
      :model-value="favoriteDialog.visible"
      max-width="500"
      @update:model-value="(value) => (favoriteDialog.visible = value)"
    >
      <v-card class="glass-panel tilt-content sapling-dialog-compact-card" elevation="12">
        <div class="sapling-dialog-shell">
          <SaplingDialogHero
            :eyebrow="$t('global.add')"
            :title="$t('navigation.favorite')"
            :subtitle="favoriteDialog.title || $t('favorite.title')"
          />

          <div class="sapling-dialog-form-body">
            <v-form ref="favoriteFormRef" class="sapling-dialog-form">
              <v-text-field
                v-model="favoriteDialog.title"
                :label="$t('favorite.title') + '*'"
                :rules="[
                  (value) =>
                    !!String(value ?? '').trim() ||
                    $t('favorite.title') + ' ' + $t('global.isRequired'),
                ]"
                required
              />
            </v-form>
          </div>

          <SaplingActionSave :cancel="closeFavoriteDialog" :save="saveFavorite" />
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts" setup>
// #region Imports
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { DEFAULT_PAGE_SIZE_OPTIONS } from '@/constants/project.constants'
import SaplingActionSave from '@/components/actions/SaplingActionSave.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import SaplingDialogEdit from '@/components/dialog/SaplingDialogEdit.vue'
import SaplingDialogDelete from '@/components/dialog/SaplingDialogDelete.vue'
import SaplingSearch from '@/components/system/SaplingSearch.vue'
import SaplingTableMultiSelect from './SaplingTableMultiSelect.vue'
import SaplingTableColumnFilter from './filter/SaplingTableColumnFilter.vue'
import {
  useSaplingTableComponent,
  type UseSaplingTableEmit,
  type UseSaplingTableProps,
} from '@/composables/table/useSaplingTableComponent'
// #endregion

// #region Async Components
const SaplingTableRow = defineAsyncComponent(() => import('./SaplingTableRow.vue'))
const SaplingTableMobileCard = defineAsyncComponent(() => import('./SaplingTableMobileCard.vue'))
// #endregion

// #region Props and Emits
const props = defineProps<UseSaplingTableProps>()
const emit = defineEmits<UseSaplingTableEmit>()

const hasCompletedInitialLoad = ref(!props.isLoading)
const mobileControlsVisible = ref(false)

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
    mobileControlsVisible.value = false
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
  editDialog,
  deleteDialog,
  bulkDeleteDialog,
  favoriteDialog,
  favoriteFormRef,
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
  selectAllRows,
  selectRow,
  clearSelection,
  deleteAllSelected,
  confirmBulkDelete,
  closeBulkDeleteDialog,
  runSelectionScriptButton,
  runRowScriptButton,
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

function getHeaderCellClasses(column: Record<string, unknown> & { key?: string | null }) {
  const key = String(column.key ?? '')

  return [
    'sapling-table-header-cell',
    key === '__select' ? 'sapling-table-header-cell--select-width' : '',
    key === '__actions' ? 'sapling-table-header-cell--actions-width' : '',
    key !== '__select' && key !== '__actions' ? 'sapling-table-header-cell--data' : '',
  ].filter(Boolean)
}
</script>
