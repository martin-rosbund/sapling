import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type {
  AccumulatedPermission,
  ColumnFilterItem,
  ColumnFilterOperator,
  DialogSaveAction,
  EditDialogOptions,
  EntityTemplate,
  SaplingTableHeaderItem,
  SortItem,
} from '@/entity/structure'
import type {
  EntityItem,
  FavoriteItem,
  SaplingGenericItem,
  ScriptButtonItem,
} from '@/entity/entity'
import {
  DESKTOP_TABLE_COLUMN_LIMIT,
  DEFAULT_ENTITY_ITEMS_COUNT,
  MOBILE_CARD_FIELD_LIMIT,
  DEFAULT_SMALL_WINDOW_WIDTH,
} from '@/constants/project.constants'
import ApiGenericService, { type FilterQuery } from '@/services/api.generic.service'
import ApiScriptService from '@/services/api.script.service'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore'
import { useGenericStore } from '@/stores/genericStore'
import {
  buildTableFilter,
  buildTableOrderBy,
  getAllowedColumnFilterOperators,
  getDefaultColumnFilterOperatorForTemplate,
  getTableHeaders,
  isFilterableTableColumn,
} from '@/utils/saplingTableUtil'
import { NAVIGATION_URL } from '@/constants/project.constants'
import type { SaplingContextMenuTableActionPayload } from '@/composables/context/useSaplingContextMenuTable'
import type { SaplingTableRowContextMenuOpenPayload } from '@/composables/table/useSaplingTableRow'

interface FavoriteDialogState {
  visible: boolean
  title: string
}

interface DeleteDialogState {
  visible: boolean
  item: SaplingGenericItem | null
}

interface BulkDeleteDialogState {
  visible: boolean
  items: SaplingGenericItem[]
}

interface TableContextMenuState {
  visible: boolean
  item: SaplingGenericItem | null
  x: number
  y: number
}

type TableColumnLike = Record<string, unknown> & {
  key: string | null
  title?: string | null
  name?: string | null
  type?: string | null
  kind?: string | null
  referenceName?: string | null
  referencedPks?: unknown
  length?: number | null
  options?: unknown
  isReference?: boolean | null
}

type FavoriteFormRef = {
  validate?: () => Promise<boolean | { valid: boolean }>
}

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
const BULK_DELETE_CONCURRENCY = 5
const FILTER_OPERATOR_OPTIONS: Array<{ label: string; value: ColumnFilterOperator }> = [
  { label: '~', value: 'like' },
  { label: 'a*', value: 'startsWith' },
  { label: '*a', value: 'endsWith' },
  { label: '=', value: 'eq' },
  { label: '>', value: 'gt' },
  { label: '>=', value: 'gte' },
  { label: '<', value: 'lt' },
  { label: '<=', value: 'lte' },
]

/**
 * Encapsulates the local UI workflow for the shared data table.
 * Keeps dialog, selection and column filter state out of the component template.
 */
export function useSaplingTableComponent(props: UseSaplingTableProps, emit: UseSaplingTableEmit) {
  // #region State
  const { t } = useI18n()
  const router = useRouter()
  const currentPersonStore = useCurrentPersonStore()
  const currentPermissionStore = useCurrentPermissionStore()
  const genericStore = useGenericStore()

  const localColumnFilters = ref<Record<string, ColumnFilterItem>>(
    cloneColumnFilters(props.columnFilters),
  )
  const loadedScriptButtons = ref<ScriptButtonItem[]>([])
  const selectedRows = ref<number[]>([])
  const selectedRow = ref<number | null>(null)
  const editDialog = ref<EditDialogOptions>({ visible: false, mode: 'create', item: null })
  const deleteDialog = ref<DeleteDialogState>({ visible: false, item: null })
  const bulkDeleteDialog = ref<BulkDeleteDialogState>({ visible: false, items: [] })
  const showUploadDialog = ref(false)
  const uploadDialogItem = ref<SaplingGenericItem | null>(null)
  const showInformationDialog = ref(false)
  const informationDialogItem = ref<SaplingGenericItem | null>(null)
  const contextMenu = ref<TableContextMenuState>({
    visible: false,
    item: null,
    x: 0,
    y: 0,
  })
  const favoriteDialog = ref<FavoriteDialogState>({ visible: false, title: '' })
  const favoriteFormRef = ref<FavoriteFormRef | null>(null)
  const initialEditDialogShown = ref(false)
  const tableContainerRef = ref<HTMLElement | null>(null)
  const containerWidth = ref(0)
  const windowWidth = ref(
    typeof window === 'undefined' ? MOBILE_TABLE_BREAKPOINT : window.innerWidth,
  )

  let resizeObserver: ResizeObserver | null = null
  let scriptButtonsRequestId = 0

  const handleWindowResize = () => {
    windowWidth.value = window.innerWidth

    if (!tableContainerRef.value) {
      containerWidth.value = window.innerWidth
    }
  }

  const selectedItems = computed(() =>
    selectedRows.value
      .map((index) => props.items[index])
      .filter((item): item is SaplingGenericItem => Boolean(item)),
  )
  const scriptButtons = computed(() => props.scriptButtons ?? loadedScriptButtons.value)
  const multiSelectScriptButtons = computed(() =>
    scriptButtons.value.filter((button) => button.isMultiSelect),
  )
  const rowScriptButtons = computed(() =>
    scriptButtons.value.filter((button) => !button.isMultiSelect),
  )
  const canNavigate = computed(() =>
    props.entityTemplates.some((template) => template.options?.includes('isNavigation')),
  )
  const canShowInformation = computed(
    () =>
      currentPermissionStore.accumulatedPermission?.some(
        (permission) => permission.entityHandle === 'information' && permission.allowRead,
      ) ?? false,
  )
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
    const referenceNames = Array.from(
      new Set(
        props.entityTemplates
          .filter((template) => template.kind === 'm:1' && template.referenceName)
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
    () => props.columnFilters,
    (value) => {
      localColumnFilters.value = cloneColumnFilters(value)
    },
  )

  watch(
    () => [props.selected, props.items, props.multiSelect] as const,
    ([newSelected]) => {
      const nextSelected = Array.isArray(newSelected) ? newSelected : []
      const selectedIdentities = new Set(
        nextSelected
          .map((selectedItem) => getGenericItemIdentity(selectedItem))
          .filter((identity) => identity.length > 0),
      )

      selectedRows.value = props.items.reduce<number[]>((indexes, item, index) => {
        if (selectedIdentities.has(getGenericItemIdentity(item))) {
          indexes.push(index)
        }

        return indexes
      }, [])

      selectedRow.value = props.multiSelect ? null : (selectedRows.value[0] ?? null)
    },
    { immediate: true },
  )

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
    () => [props.entityHandle, props.scriptButtons] as const,
    () => {
      void loadScriptButtons()
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
    const compactHeaders = dataHeaders.value.filter((header) =>
      header.options?.includes('isShowInCompact'),
    )
    const fallbackHeaders = dataHeaders.value.filter(
      (header) => !header.options?.includes('isShowInCompact'),
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

  // #region Table Interaction
  function onSearchUpdate(value: string) {
    emit('update:search', value)
  }

  function onPageUpdate(value: number) {
    emit('update:page', value)
  }

  function onItemsPerPageUpdate(value: number | string) {
    const limit = value === -1 ? DEFAULT_ENTITY_ITEMS_COUNT : Number(value)
    emit('update:itemsPerPage', limit)
  }

  function onSortByUpdate(value: SortItem[]) {
    const filteredSort = value.filter((item) => item.key !== '__actions')
    if (filteredSort.length !== value.length) {
      return
    }

    emit('update:sortBy', filteredSort)
  }

  function toggleColumnSort(key: string) {
    if (!key || key === '__actions' || key === '__select') {
      return
    }

    const currentSort = props.sortBy.find((item) => item.key === key)
    if (!currentSort) {
      emit('update:sortBy', [{ key, order: 'asc' }])
      return
    }

    if (currentSort.order === 'asc') {
      emit('update:sortBy', [{ key, order: 'desc' }])
      return
    }

    emit('update:sortBy', [])
  }

  function getColumnSortIcon(key: string) {
    const currentSort = props.sortBy.find((item) => item.key === key)
    if (currentSort?.order === 'asc') {
      return 'mdi-arrow-up'
    }

    if (currentSort?.order === 'desc') {
      return 'mdi-arrow-down'
    }

    return 'mdi-swap-vertical'
  }

  function selectAllRows() {
    selectedRows.value = props.items.map((_, index) => index)
    emitSelectedItems()
  }

  function selectRow(index: number) {
    const nextItem = props.items[index]
    if (!nextItem) {
      return
    }

    if (props.multiSelect) {
      const selectedIndex = selectedRows.value.indexOf(index)
      if (selectedIndex === -1) {
        selectedRows.value = [...selectedRows.value, index]
      } else {
        selectedRows.value = selectedRows.value.filter((rowIndex) => rowIndex !== index)
      }

      emitSelectedItems()
      return
    }

    selectedRow.value = index
    emit('update:selected', [nextItem])
  }

  function clearSelection() {
    selectedRows.value = []
    selectedRow.value = null
    emit('update:selected', [])
  }

  function emitSelectedItems() {
    emit('update:selected', selectedItems.value)
  }
  // #endregion

  // #region Column Filters
  function onColumnFilterChange(key: string, filter: ColumnFilterItem | null) {
    const nextFilters = { ...localColumnFilters.value }

    if (!filter) {
      delete nextFilters[key]
      localColumnFilters.value = nextFilters
      emit('update:columnFilters', nextFilters)
      return
    }

    const normalizedFilter = normalizeColumnFilterItem(props.entityTemplates, key, filter)
    if (isEmptyColumnFilterItem(normalizedFilter)) {
      delete nextFilters[key]
    } else {
      nextFilters[key] = normalizedFilter
    }

    localColumnFilters.value = nextFilters
    emit('update:columnFilters', nextFilters)
  }

  function getColumnFilterItem(key: string) {
    const filter = localColumnFilters.value[key]
    if (!filter) {
      return undefined
    }

    return {
      ...filter,
      relationItems: filter.relationItems?.map((item) => ({ ...item })),
    }
  }

  function getFilterOperatorOptions(column: TableColumnLike) {
    return FILTER_OPERATOR_OPTIONS.filter((option) =>
      getAllowedColumnFilterOperators(normalizeColumnTemplate(column)).includes(option.value),
    )
  }

  function isColumnFilterable(column: TableColumnLike) {
    const normalizedColumn = normalizeColumnTemplate(column)
    return normalizedColumn ? isFilterableTableColumn(normalizedColumn) : false
  }
  // #endregion

  // #region Entity Actions
  async function loadScriptButtons() {
    if (props.scriptButtons) {
      loadedScriptButtons.value = props.scriptButtons
      return
    }

    if (!props.entityHandle) {
      loadedScriptButtons.value = []
      return
    }

    const currentRequestId = ++scriptButtonsRequestId
    const result = await ApiGenericService.find<ScriptButtonItem>('scriptButton', {
      filter: { entity: { handle: props.entityHandle } },
      orderBy: buildTableOrderBy([{ key: 'title', order: 'asc' }]),
      limit: DEFAULT_ENTITY_ITEMS_COUNT,
      relations: ['m:1'],
    })

    if (currentRequestId !== scriptButtonsRequestId) {
      return
    }

    loadedScriptButtons.value = result.data
  }

  async function downloadJSON() {
    if (!props.entityHandle) {
      return
    }

    const filter =
      props.activeFilter ??
      buildTableFilter({
        search: props.search,
        columnFilters: localColumnFilters.value,
        entityTemplates: props.entityTemplates,
        parentFilter: props.parentFilter,
      })

    const json = await ApiGenericService.downloadJSON(props.entityHandle, {
      filter,
      orderBy: buildTableOrderBy(props.sortBy),
      relations: ['m:1'],
    })

    downloadJSONFile(json, `${props.entityHandle}.json`)
  }

  function exportSelectedJSON() {
    if (!props.entityHandle || selectedItems.value.length === 0) {
      return
    }

    downloadJSONFile(selectedItems.value, `${props.entityHandle}-selected.json`)
  }

  function downloadJSONFile(data: unknown, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function openContextMenu({ item, x, y }: SaplingTableRowContextMenuOpenPayload) {
    contextMenu.value = {
      visible: true,
      item,
      x,
      y,
    }
  }

  function closeContextMenu() {
    contextMenu.value = {
      ...contextMenu.value,
      visible: false,
    }
  }

  function openUploadDialog(item: SaplingGenericItem) {
    uploadDialogItem.value = item
    showUploadDialog.value = true
  }

  function closeUploadDialog() {
    showUploadDialog.value = false
    uploadDialogItem.value = null
  }

  function openInformationDialog(item: SaplingGenericItem) {
    informationDialogItem.value = item
    showInformationDialog.value = true
  }

  function closeInformationDialog() {
    showInformationDialog.value = false
    informationDialogItem.value = null
  }

  function navigateToAddress(item: SaplingGenericItem) {
    if (!canNavigate.value) {
      return
    }

    const address = props.entityTemplates
      .filter((template) => template.options?.includes('isNavigation'))
      .map((template) => item[template.name || ''])
      .filter(Boolean)
      .join(' ')

    if (!address) {
      return
    }

    const url = `${NAVIGATION_URL}${encodeURIComponent(address)}`
    window.open(url, '_blank')
  }

  function openTimeline(item: SaplingGenericItem) {
    if (item.handle == null) {
      return
    }

    void router.push(`/timeline/${props.entityHandle}/${String(item.handle)}`)
  }

  function navigateToDocuments(item: SaplingGenericItem) {
    if (item.handle == null) {
      return
    }

    const url = `/file/document?filter={"reference":"${String(item.handle)}","entity":"${props.entityHandle}"}`
    window.open(url, '_blank')
  }

  function onContextMenuAction({ type, item, scriptButton }: SaplingContextMenuTableActionPayload) {
    switch (type) {
      case 'edit':
        void openEditDialog(item)
        break
      case 'show':
        openShowDialog(item)
        break
      case 'delete':
        openDeleteDialog(item)
        break
      case 'favorite':
        openFavoriteDialog()
        break
      case 'copy':
        openCopyDialog(item)
        break
      case 'navigate':
        navigateToAddress(item)
        break
      case 'timeline':
        openTimeline(item)
        break
      case 'uploadDocument':
        openUploadDialog(item)
        break
      case 'showDocuments':
        navigateToDocuments(item)
        break
      case 'showInformation':
        openInformationDialog(item)
        break
      case 'script':
        if (scriptButton) {
          void runRowScriptButton({ button: scriptButton, item })
        }
        break
      default:
        break
    }

    closeContextMenu()
  }

  function openCreateDialog() {
    editDialog.value = { visible: true, mode: 'create', item: null }
  }

  async function openEditDialog(item: SaplingGenericItem) {
    const dialogItem = await loadDialogItem(item)
    editDialog.value = { visible: true, mode: 'edit', item: dialogItem }
  }

  function openShowDialog(item: SaplingGenericItem) {
    editDialog.value = { visible: true, mode: 'readonly', item }
  }

  function openCopyDialog(item: SaplingGenericItem) {
    const copiedItem = { ...item }

    props.entityTemplates
      .filter((template) => template.name === 'handle' || template.isUnique)
      .forEach((template) => {
        delete copiedItem[template.name]
      })

    editDialog.value = { visible: true, mode: 'create', item: copiedItem }
  }

  function closeDialog() {
    editDialog.value = { ...editDialog.value, visible: false }
  }

  async function loadDialogItem(item: SaplingGenericItem) {
    const handle = getItemHandle(item)
    if (handle == null || !props.entityHandle) {
      return item
    }

    const result = await ApiGenericService.find<SaplingGenericItem>(props.entityHandle, {
      filter: { handle },
      limit: 1,
      relations: ['m:1'],
    })

    return result.data[0] ?? item
  }

  async function saveDialog(item: SaplingGenericItem, action: DialogSaveAction) {
    if (!props.entityHandle) {
      return
    }

    let nextDialogItem: SaplingGenericItem | null = null

    if (editDialog.value.mode === 'edit' && editDialog.value.item) {
      const handle = getItemHandle(editDialog.value.item)
      if (handle == null) {
        return
      }

      nextDialogItem = await loadDialogItem(
        await ApiGenericService.update(props.entityHandle, handle, item),
      )
    } else if (editDialog.value.mode === 'create') {
      nextDialogItem = await loadDialogItem(
        await ApiGenericService.create(props.entityHandle, item),
      )
    }

    emit('reload')

    if (action === 'saveAndClose') {
      closeDialog()
      return
    }

    editDialog.value = {
      visible: true,
      mode: 'edit',
      item: nextDialogItem ?? item,
    }
  }

  function openDeleteDialog(item: SaplingGenericItem) {
    deleteDialog.value = { visible: true, item }
  }

  function closeDeleteDialog() {
    deleteDialog.value = { visible: false, item: null }
  }

  async function confirmDelete() {
    const handle = getItemHandle(deleteDialog.value.item)
    if (handle == null || !props.entityHandle) {
      return
    }

    await ApiGenericService.delete(props.entityHandle, handle)
    closeDeleteDialog()
    emit('reload')
  }

  function deleteAllSelected() {
    if (!selectedRows.value.length) {
      return
    }

    bulkDeleteDialog.value = {
      visible: true,
      items: selectedItems.value,
    }
  }

  function closeBulkDeleteDialog() {
    bulkDeleteDialog.value = { visible: false, items: [] }
  }

  async function confirmBulkDelete() {
    if (!props.entityHandle) {
      return
    }

    const handles = bulkDeleteDialog.value.items
      .map((item) => getItemHandle(item))
      .filter((handle): handle is string | number => handle != null)

    for (let index = 0; index < handles.length; index += BULK_DELETE_CONCURRENCY) {
      const batch = handles.slice(index, index + BULK_DELETE_CONCURRENCY)
      await Promise.all(
        batch.map((handle) => ApiGenericService.delete(props.entityHandle!, handle)),
      )
    }

    clearSelection()
    closeBulkDeleteDialog()
    emit('reload')
  }

  async function executeScriptButton(button: ScriptButtonItem, items: SaplingGenericItem[]) {
    if (!props.entity || items.length === 0) {
      return
    }

    await currentPersonStore.fetchCurrentPerson()
    if (!currentPersonStore.person) {
      return
    }

    const result = await ApiScriptService.runClient(
      items,
      props.entity,
      currentPersonStore.person,
      button.name,
      button.parameter,
    )

    if (result.isSuccess !== false) {
      emit('reload')
    }
  }

  async function runSelectionScriptButton(button: ScriptButtonItem) {
    await executeScriptButton(button, selectedItems.value)
  }

  async function runRowScriptButton(payload: {
    button: ScriptButtonItem
    item: SaplingGenericItem
  }) {
    await executeScriptButton(payload.button, [payload.item])
  }
  // #endregion

  // #region Favorites
  function openFavoriteDialog() {
    const trimmedSearch = props.search.trim()
    favoriteDialog.value = {
      visible: true,
      title:
        trimmedSearch.length > 0
          ? `${getFavoriteEntityTitle()}: ${trimmedSearch}`
          : getFavoriteEntityTitle(),
    }
  }

  function closeFavoriteDialog() {
    favoriteDialog.value = { visible: false, title: '' }
  }

  async function saveFavorite() {
    const validationResult = await favoriteFormRef.value?.validate?.()
    const isValid =
      typeof validationResult === 'boolean' ? validationResult : (validationResult?.valid ?? true)

    const trimmedTitle = favoriteDialog.value.title.trim()
    if (!isValid || trimmedTitle.length === 0 || !props.entityHandle) {
      return
    }

    await currentPersonStore.fetchCurrentPerson()
    const personHandle = currentPersonStore.person?.handle
    if (personHandle == null) {
      return
    }

    await ApiGenericService.create<FavoriteItem>('favorite', {
      title: trimmedTitle,
      entity: props.entityHandle,
      person: personHandle,
      filter: getCurrentFavoriteFilter(),
    })

    closeFavoriteDialog()
  }

  function getFavoriteEntityTitle() {
    const translationKey = `navigation.${props.entityHandle}`
    const translatedTitle = t(translationKey)
    return translatedTitle !== translationKey
      ? translatedTitle
      : (props.entity?.title ?? props.entityHandle)
  }

  function getCurrentFavoriteFilter() {
    if (!props.activeFilter) {
      return undefined
    }

    const serializedFilter = JSON.stringify(props.activeFilter)
    if (serializedFilter === '{}' || serializedFilter === 'null') {
      return undefined
    }

    return JSON.parse(serializedFilter) as FilterQuery
  }
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
    favoriteFormRef,
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

function cloneColumnFilters(filters?: Record<string, ColumnFilterItem>) {
  if (!filters) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(filters).map(([key, value]) => [
      key,
      {
        ...value,
        relationItems: value.relationItems?.map((item) => ({ ...item })),
      },
    ]),
  )
}

function normalizeColumnFilterItem(
  entityTemplates: EntityTemplate[],
  key: string,
  filter: ColumnFilterItem,
): ColumnFilterItem {
  return {
    operator: getNormalizedColumnFilterOperator(entityTemplates, key, filter.operator),
    value: filter.value.trim(),
    rangeStart: filter.rangeStart?.trim() || undefined,
    rangeEnd: filter.rangeEnd?.trim() || undefined,
    relationItems: filter.relationItems?.map((item) => ({ ...item })),
  }
}

function getNormalizedColumnFilterOperator(
  entityTemplates: EntityTemplate[],
  key: string,
  operator: ColumnFilterOperator,
) {
  const template = getColumnTemplate(entityTemplates, key)
  const allowedOperators = getAllowedColumnFilterOperators(template)
  return allowedOperators.includes(operator)
    ? operator
    : getDefaultColumnFilterOperatorForTemplate(template)
}

function isEmptyColumnFilterItem(filter: ColumnFilterItem) {
  return (
    filter.value.length === 0 &&
    (filter.rangeStart?.length ?? 0) === 0 &&
    (filter.rangeEnd?.length ?? 0) === 0 &&
    (filter.relationItems?.length ?? 0) === 0
  )
}

function getColumnTemplate(entityTemplates: EntityTemplate[], key: string) {
  return entityTemplates.find((item) => item.name === key || item.key === key)
}

function normalizeColumnTemplate(column?: TableColumnLike | Partial<EntityTemplate>) {
  if (!column) {
    return undefined
  }

  return {
    key: ('key' in column ? column.key : undefined) ?? undefined,
    name: typeof column.name === 'string' ? column.name : undefined,
    type: typeof column.type === 'string' ? column.type : undefined,
    kind: typeof column.kind === 'string' ? column.kind : undefined,
    referenceName: typeof column.referenceName === 'string' ? column.referenceName : undefined,
    referencedPks: Array.isArray(column.referencedPks)
      ? column.referencedPks.filter((key): key is string => typeof key === 'string')
      : undefined,
    length: typeof column.length === 'number' ? column.length : undefined,
    options: Array.isArray(column.options)
      ? (column.options.filter(
          (option): option is string => typeof option === 'string',
        ) as EntityTemplate['options'])
      : undefined,
    isReference: column.isReference === true,
  }
}

function getItemHandle(item?: SaplingGenericItem | null) {
  if (!item || typeof item !== 'object') {
    return null
  }

  const { handle } = item
  return typeof handle === 'string' || typeof handle === 'number' ? handle : null
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

function getGenericItemIdentity(item?: SaplingGenericItem) {
  const handle = getItemHandle(item)
  if (handle != null) {
    return `handle:${String(handle)}`
  }

  return JSON.stringify(item)
}
