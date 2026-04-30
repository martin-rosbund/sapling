import { computed, ref, watch, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type {
  AccumulatedPermission,
  ColumnFilterItem,
  DialogSaveAction,
  EditDialogOptions,
  EntityTemplate,
  SortItem,
} from '@/entity/structure'
import type {
  EntityItem,
  FavoriteItem,
  SaplingGenericItem,
  ScriptButtonItem,
} from '@/entity/entity'
import { DEFAULT_ENTITY_ITEMS_COUNT, NAVIGATION_URL } from '@/constants/project.constants'
import ApiGenericService, { type FilterQuery } from '@/services/api.generic.service'
import ApiScriptService from '@/services/api.script.service'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore'
import { buildTableFilter, buildTableOrderBy } from '@/utils/saplingTableUtil'
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

interface UseSaplingTableActionsProps {
  search: string
  sortBy: SortItem[]
  entityHandle: string
  entity: EntityItem | null
  entityPermission: AccumulatedPermission | null
  entityTemplates: EntityTemplate[]
  parentFilter?: Record<string, unknown>
  scriptButtons?: ScriptButtonItem[]
  activeFilter?: FilterQuery
}

type UseSaplingTableActionsEmit = {
  (event: 'reload'): void
}

interface UseSaplingTableActionsOptions {
  props: UseSaplingTableActionsProps
  emit: UseSaplingTableActionsEmit
  localColumnFilters: Ref<Record<string, ColumnFilterItem>>
  selectedItems: Ref<SaplingGenericItem[]>
  selectedRows: Ref<number[]>
  clearSelection: () => void
}

const BULK_DELETE_CONCURRENCY = 5

export function useSaplingTableActions({
  props,
  emit,
  localColumnFilters,
  selectedItems,
  selectedRows,
  clearSelection,
}: UseSaplingTableActionsOptions) {
  const { t } = useI18n()
  const router = useRouter()
  const currentPersonStore = useCurrentPersonStore()
  const currentPermissionStore = useCurrentPermissionStore()

  const loadedScriptButtons = ref<ScriptButtonItem[]>([])
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

  let scriptButtonsRequestId = 0

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

  watch(
    () => [props.entityHandle, props.scriptButtons] as const,
    () => {
      void loadScriptButtons()
    },
    { immediate: true },
  )

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

  function refreshTable() {
    emit('reload')
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
      await Promise.all(batch.map((handle) => ApiGenericService.delete(props.entityHandle, handle)))
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
    const trimmedTitle = favoriteDialog.value.title.trim()
    if (trimmedTitle.length === 0 || !props.entityHandle) {
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

  return {
    scriptButtons,
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
  }
}

function getItemHandle(item?: SaplingGenericItem | null) {
  if (!item || typeof item !== 'object') {
    return null
  }

  const { handle } = item
  return typeof handle === 'string' || typeof handle === 'number' ? handle : null
}
