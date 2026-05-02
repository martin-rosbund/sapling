import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  AccumulatedPermission,
  ColumnFilterItem,
  EntityTemplate,
  SaplingTableHeaderItem,
  SortItem,
} from '@/entity/structure'
import type { SaplingGenericItem } from '@/entity/entity'
import {
  DESKTOP_TABLE_COLUMN_LIMIT,
  MOBILE_CARD_FIELD_LIMIT,
  DEFAULT_SMALL_WINDOW_WIDTH,
} from '@/constants/project.constants'
import type { EntityItem, ScriptButtonItem } from '@/entity/entity'
import type { FilterQuery } from '@/services/api.generic.service'
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore'
import { useGenericStore } from '@/stores/genericStore'
import { getTableHeaders } from '@/utils/saplingTableUtil'
import { useSaplingTableFilters } from '@/composables/table/useSaplingTableFilters'
import { useSaplingTableSelection } from '@/composables/table/useSaplingTableSelection'
import { useSaplingTableActions } from '@/composables/table/useSaplingTableActions'

export interface UseSaplingTableProps {
  items: SaplingGenericItem[]
  parent?: SaplingGenericItem | null
  parentEntity?: EntityItem | null
  search: string
  page: number
  itemsPerPage: number
  totalItems: number
  isLoading: boolean
  sortBy: SortItem[]
  entityHandle: string
  entity: EntityItem | null
  entityPermission: AccumulatedPermission | null
  entityTemplates: EntityTemplate[]
  parentFilter?: Record<string, unknown>
  columnFilters?: Record<string, ColumnFilterItem>
  activeFilter?: FilterQuery
  showActions: boolean
  tableKey: string
  headers?: SaplingTableHeaderItem[]
  multiSelect?: boolean
  scriptButtons?: ScriptButtonItem[]
  selected?: SaplingGenericItem[]
  isOpenEditDialog?: boolean
}

export type UseSaplingTableEmit = {
  (event: 'update:search', value: string): void
  (event: 'update:page', value: number): void
  (event: 'update:itemsPerPage', value: number): void
  (event: 'update:sortBy', value: SortItem[]): void
  (event: 'update:columnFilters', value: Record<string, ColumnFilterItem>): void
  (event: 'reload'): void
  (event: 'update:selected', value: SaplingGenericItem[]): void
}

const MOBILE_TABLE_BREAKPOINT = DEFAULT_SMALL_WINDOW_WIDTH
const COMPACT_TOOLBAR_BREAKPOINT = 760

/**
 * Encapsulates the local UI workflow for the shared data table.
 * Keeps dialog, selection and column filter state out of the component template.
 */
export function useSaplingTableComponent(props: UseSaplingTableProps, emit: UseSaplingTableEmit) {
  // #region State
  const { t } = useI18n()
  const currentPermissionStore = useCurrentPermissionStore()
  const genericStore = useGenericStore()

  const {
    localColumnFilters,
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
  } = useSaplingTableFilters(props, emit)
  const { selectedItems, selectedRows, selectedRow, selectAllRows, selectRow, clearSelection } =
    useSaplingTableSelection(props, emit)
  const {
    multiSelectScriptButtons,
    rowScriptButtons,
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
    isDownloadingJSON,
    downloadJSON,
    refreshTable,
    exportSelectedJSON,
    openContextMenu,
    closeContextMenu,
    onContextMenuAction,
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
    deleteAllSelected,
    confirmBulkDelete,
    closeBulkDeleteDialog,
    runSelectionScriptButton,
    runRowScriptButton,
  } = useSaplingTableActions({
    props,
    emit,
    localColumnFilters,
    selectedItems,
    selectedRows,
    clearSelection,
  })
  const initialEditDialogShown = ref(false)
  const tableContainerRef = ref<HTMLElement | null>(null)
  const containerWidth = ref(0)
  const windowWidth = ref(
    typeof window === 'undefined' ? MOBILE_TABLE_BREAKPOINT : window.innerWidth,
  )

  let resizeObserver: ResizeObserver | null = null

  const handleWindowResize = () => {
    windowWidth.value = window.innerWidth

    if (!tableContainerRef.value) {
      containerWidth.value = window.innerWidth
    }
  }

  const responsiveWidth = computed(() => {
    if (containerWidth.value > 0) {
      return containerWidth.value
    }

    return windowWidth.value
  })
  const isMobileTable = computed(() => responsiveWidth.value < MOBILE_TABLE_BREAKPOINT)
  const showToolbarActionsInline = computed(
    () => responsiveWidth.value >= COMPACT_TOOLBAR_BREAKPOINT,
  )
  // #endregion

  // #region Lifecycle
  onMounted(() => {
    window.addEventListener('resize', handleWindowResize)
    void currentPermissionStore.fetchCurrentPermission()

    if (!tableContainerRef.value) {
      containerWidth.value = window.innerWidth
    } else {
      resizeObserver = new ResizeObserver((entries) => {
        const [entry] = entries
        if (entry) {
          containerWidth.value = entry.contentRect.width
        }
      })

      resizeObserver.observe(tableContainerRef.value)
      containerWidth.value = tableContainerRef.value.offsetWidth
    }
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleWindowResize)

    if (resizeObserver && tableContainerRef.value) {
      resizeObserver.unobserve(tableContainerRef.value)
      resizeObserver.disconnect()
    }

    resizeObserver = null
  })
  // #endregion

  // #region Shared Reference Metadata
  async function preloadReferenceData() {
    await currentPermissionStore.fetchCurrentPermission()

    const referenceNames = Array.from(
      new Set(
        props.entityTemplates
          .filter(
            (template) =>
              template.kind === 'm:1' &&
              template.referenceName &&
              currentPermissionStore.accumulatedPermission?.find(
                (permission) => permission.entityHandle === template.referenceName,
              )?.allowRead,
          )
          .map((template) => template.referenceName as string),
      ),
    )

    if (referenceNames.length === 0) {
      return
    }

    await genericStore.loadGenericMany(
      referenceNames.map((referenceName) => ({
        entityHandle: referenceName,
        namespaces: ['global'],
      })),
    )
  }
  // #endregion

  // #region Watchers
  watch(
    () => [props.items, props.isOpenEditDialog] as const,
    ([items, isOpenEditDialog]) => {
      if (
        isOpenEditDialog &&
        Array.isArray(items) &&
        items.length > 0 &&
        !editDialog.value.visible &&
        !initialEditDialogShown.value
      ) {
        editDialog.value = { visible: true, mode: 'edit', item: items[0] ?? null }
        initialEditDialogShown.value = true
      }

      if (!isOpenEditDialog) {
        initialEditDialogShown.value = false
      }
    },
    { immediate: true },
  )

  watch(
    () =>
      props.entityTemplates
        .map((template) => `${template.referenceName ?? ''}:${template.kind ?? ''}`)
        .join('|'),
    () => {
      void preloadReferenceData()
    },
    { immediate: true },
  )
  // #endregion

  // #region Computed
  const tableHeaders = computed<SaplingTableHeaderItem[]>(() =>
    props.headers?.length ? props.headers : getTableHeaders(props.entityTemplates, props.entity, t),
  )

  const dataHeaders = computed(() =>
    tableHeaders.value.filter((header) => header.key !== '__select' && header.key !== '__actions'),
  )

  const mobileCardHeaders = computed<SaplingTableHeaderItem[]>(() => {
    const compactHeaders = dataHeaders.value.filter((header) => header.options?.includes('isValue'))
    const fallbackHeaders = dataHeaders.value.filter(
      (header) => !header.options?.includes('isValue'),
    )

    return [...compactHeaders, ...fallbackHeaders].slice(0, MOBILE_CARD_FIELD_LIMIT)
  })

  const visibleHeaders = computed<SaplingTableHeaderItem[]>(() => {
    let headers = dataHeaders.value
      .slice(0, DESKTOP_TABLE_COLUMN_LIMIT)
      .map((header) => withCellClass(header, 'sapling-table__cell--data'))

    if (props.multiSelect) {
      headers = [
        withCellClass(
          { key: '__select', title: '', name: '__select', type: 'select' },
          'sapling-table__cell--select',
        ),
        ...headers,
      ]
    }

    if (props.showActions) {
      headers = [
        ...headers,
        withCellClass(
          { key: '__actions', title: '', name: '__actions', type: 'actions' },
          'sapling-table__cell--actions',
        ),
      ]
    }

    return headers
  })
  // #endregion

  // #region Return
  return {
    tableContainerRef,
    selectedRows,
    selectedRow,
    localColumnFilters,
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
    isDownloadingJSON,
    showToolbarActionsInline,
    isMobileTable,
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
    downloadJSON,
    refreshTable,
    exportSelectedJSON,
    openContextMenu,
    closeContextMenu,
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
  }
  // #endregion
}

function withCellClass(header: SaplingTableHeaderItem, className: string): SaplingTableHeaderItem {
  const existingCellProps =
    typeof header.cellProps === 'object' && header.cellProps !== null
      ? (header.cellProps as Record<string, unknown>)
      : {}
  const existingClass =
    typeof existingCellProps.class === 'string' ? existingCellProps.class.trim() : ''

  return {
    ...header,
    cellProps: {
      ...existingCellProps,
      class: [existingClass, className].filter(Boolean).join(' '),
    },
  }
}
