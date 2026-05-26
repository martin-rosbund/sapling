import { computed, ref, watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type {
  AccumulatedPermission,
  ColumnFilterItem,
  DialogSaveAction,
  DialogSaveContext,
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
import ApiGenericService, {
  getGenericUpdateConflict,
  type FilterQuery,
  type GenericUpdateConflictDetails,
} from '@/services/api.generic.service'
import ApiScriptService from '@/services/api.script.service'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore'
import { useTimelineDialogStore } from '@/stores/timelineDialogStore'
import { useChangeLogDialogStore } from '@/stores/changeLogDialogStore'
import { buildFavoritePath } from '@/utils/saplingFavoriteNavigation'
import { buildTableFilter, buildTableOrderBy } from '@/utils/saplingTableUtil'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import { useSaplingMailDialog } from '@/composables/dialog/useSaplingMailDialog'
import { buildMailMenuActions } from '@/utils/saplingMailMenuUtil'
import { buildCsv, buildCsvTemplate, parseCsv } from '@/utils/saplingCsvUtil'
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

export interface UpdateConflictDialogState {
  visible: boolean
  conflict: GenericUpdateConflictDetails | null
  draftItem: SaplingGenericItem | null
  action: DialogSaveAction
  isSaving: boolean
}

interface TableContextMenuState {
  visible: boolean
  item: SaplingGenericItem | null
  x: number
  y: number
}

interface UseSaplingTableActionsProps {
  items: SaplingGenericItem[]
  search: string
  sortBy: SortItem[]
  entityHandle: string
  entity: EntityItem | null
  entityPermission: AccumulatedPermission | null
  entityTemplates: EntityTemplate[]
  parentFilter?: Record<string, unknown>
  scriptButtons?: ScriptButtonItem[]
  activeFilter?: FilterQuery
  showActions?: boolean
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
  const route = useRoute()
  const router = useRouter()
  const currentPersonStore = useCurrentPersonStore()
  const currentPermissionStore = useCurrentPermissionStore()
  const timelineDialogStore = useTimelineDialogStore()
  const changeLogDialogStore = useChangeLogDialogStore()
  const { pushMessage } = useSaplingMessageCenter()
  const { openMailDialog } = useSaplingMailDialog()

  const loadedScriptButtons = ref<ScriptButtonItem[]>([])
  const editDialog = ref<EditDialogOptions>({ visible: false, mode: 'create', item: null })
  const deleteDialog = ref<DeleteDialogState>({ visible: false, item: null })
  const bulkDeleteDialog = ref<BulkDeleteDialogState>({ visible: false, items: [] })
  const updateConflictDialog = ref<UpdateConflictDialogState>({
    visible: false,
    conflict: null,
    draftItem: null,
    action: 'save',
    isSaving: false,
  })
  const showUploadDialog = ref(false)
  const uploadDialogItem = ref<SaplingGenericItem | null>(null)
  const showInformationDialog = ref(false)
  const informationDialogItem = ref<SaplingGenericItem | null>(null)
  const isDownloadingJSON = ref(false)
  const isImportingCSV = ref(false)
  const contextMenu = ref<TableContextMenuState>({
    visible: false,
    item: null,
    x: 0,
    y: 0,
  })
  const favoriteDialog = ref<FavoriteDialogState>({ visible: false, title: '' })
  const currentEntityFavorites = ref<FavoriteItem[]>([])
  const isCurrentEntityFavoritesLoading = ref(false)

  let scriptButtonsRequestId = 0
  let favoritesRequestId = 0

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
  const contextMenuMailActions = computed(() =>
    buildMailMenuActions(props.entityTemplates, contextMenu.value.item),
  )

  watch(
    () => [props.entityHandle, props.scriptButtons] as const,
    () => {
      void loadScriptButtons()
    },
    { immediate: true },
  )

  watch(
    () => props.entityHandle,
    () => {
      void loadCurrentEntityFavorites()
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

  async function loadCurrentEntityFavorites() {
    if (!props.entityHandle) {
      currentEntityFavorites.value = []
      isCurrentEntityFavoritesLoading.value = false
      return
    }

    const currentRequestId = ++favoritesRequestId
    isCurrentEntityFavoritesLoading.value = true

    try {
      await currentPersonStore.fetchCurrentPerson()
      const personHandle = currentPersonStore.person?.handle

      if (personHandle == null) {
        currentEntityFavorites.value = []
        return
      }

      const result = await ApiGenericService.find<FavoriteItem>('favorite', {
        filter: {
          person: { handle: personHandle },
          entity: { handle: props.entityHandle },
        },
        orderBy: buildTableOrderBy([{ key: 'title', order: 'asc' }]),
        relations: ['entity', 'entityRoute'],
        limit: DEFAULT_ENTITY_ITEMS_COUNT,
      })

      if (currentRequestId !== favoritesRequestId) {
        return
      }

      currentEntityFavorites.value = result.data ?? []
    } finally {
      if (currentRequestId === favoritesRequestId) {
        isCurrentEntityFavoritesLoading.value = false
      }
    }
  }

  async function downloadJSON() {
    if (!props.entityHandle || isDownloadingJSON.value) {
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

    try {
      isDownloadingJSON.value = true
      const json = await ApiGenericService.downloadJSON(props.entityHandle, {
        filter,
        orderBy: buildTableOrderBy(props.sortBy),
        relations: ['m:1'],
      })

      downloadJSONFile(json, `${props.entityHandle}.json`)
      pushMessage(
        'success',
        t('global.jsonExported'),
        t('global.jsonExportedDescription', { count: json.length }),
        props.entityHandle,
      )
    } catch {
      // API errors are already routed through the shared message center.
    } finally {
      isDownloadingJSON.value = false
    }
  }

  function exportCSVTemplate() {
    if (!props.entityHandle) {
      return
    }

    downloadTextFile(
      buildCsvTemplate(props.entityTemplates),
      `${props.entityHandle}-template.csv`,
      'text/csv;charset=utf-8',
    )
    pushMessage(
      'success',
      t('global.csvTemplateExported'),
      t('global.csvTemplateExportedDescription'),
      props.entityHandle,
    )
  }

  async function exportCSV() {
    if (!props.entityHandle || isDownloadingJSON.value) {
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

    try {
      isDownloadingJSON.value = true
      const items = await ApiGenericService.downloadJSON<SaplingGenericItem>(props.entityHandle, {
        filter,
        orderBy: buildTableOrderBy(props.sortBy),
        relations: ['m:1'],
      })

      downloadTextFile(
        buildCsv(items, props.entityTemplates),
        `${props.entityHandle}.csv`,
        'text/csv;charset=utf-8',
      )
      pushMessage(
        'success',
        t('global.csvExported'),
        t('global.csvExportedDescription', { count: items.length }),
        props.entityHandle,
      )
    } catch {
      // API errors are already routed through the shared message center.
    } finally {
      isDownloadingJSON.value = false
    }
  }

  async function importCSVFile(file: File | null) {
    if (!file || !props.entityHandle || isImportingCSV.value) {
      return
    }

    if (!isSupportedCsvFile(file)) {
      pushMessage(
        'warning',
        t('global.csvImportUnsupportedFile'),
        t('global.csvImportUnsupportedFileDescription'),
        props.entityHandle,
      )
      return
    }

    try {
      isImportingCSV.value = true
      const rows = parseCsv(await file.text())
      const result = await ApiGenericService.importRows(props.entityHandle, rows)

      emit('reload')
      pushMessage(
        result.failed > 0 ? 'warning' : 'success',
        t('global.csvImported'),
        t('global.csvImportedDescription', {
          created: result.created,
          updated: result.updated,
          failed: result.failed,
          skipped: result.skipped,
        }),
        props.entityHandle,
      )
    } catch {
      // API errors are already routed through the shared message center.
    } finally {
      isImportingCSV.value = false
    }
  }

  function refreshTable() {
    emit('reload')
  }

  function exportSelectedJSON() {
    if (!props.entityHandle || selectedItems.value.length === 0) {
      return
    }

    downloadJSONFile(selectedItems.value, `${props.entityHandle}-selected.json`)
    pushMessage(
      'success',
      t('global.selectionExported'),
      t('global.selectionExportedDescription', { count: selectedItems.value.length }),
      props.entityHandle,
    )
  }

  function downloadJSONFile(data: unknown, filename: string) {
    downloadTextFile(JSON.stringify(data, null, 2), filename, 'application/json')
  }

  function downloadTextFile(data: string, filename: string, type: string) {
    const blob = new Blob([data], { type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function isSupportedCsvFile(file: File): boolean {
    const normalizedName = file.name.toLowerCase()
    return (
      normalizedName.endsWith('.csv') ||
      normalizedName.endsWith('.txt') ||
      normalizedName.endsWith('.tsv') ||
      file.type === 'text/csv' ||
      file.type === 'text/plain'
    )
  }

  function openContextMenu({ item, x, y }: SaplingTableRowContextMenuOpenPayload) {
    // Kontextmenü nur öffnen, wenn showActions true ist
    if (props.showActions === false) {
      contextMenu.value = { ...contextMenu.value, visible: false }
      return
    }
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

    timelineDialogStore.openTimeline(props.entityHandle, String(item.handle))
  }

  function openChangeLog(item: SaplingGenericItem) {
    if (item.handle == null) {
      return
    }

    changeLogDialogStore.openChangeLog(props.entityHandle, String(item.handle))
  }

  function navigateToDocuments(item: SaplingGenericItem) {
    if (item.handle == null) {
      return
    }

    const url = `/file/document?filter={"reference":"${String(item.handle)}","entity":"${props.entityHandle}"}`
    window.open(url, '_blank')
  }

  function onContextMenuAction({
    type,
    item,
    scriptButton,
    mailAction,
  }: SaplingContextMenuTableActionPayload) {
    switch (type) {
      case 'edit':
        void openEditDialog(item)
        break
      case 'changeLog':
        openChangeLog(item)
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
      case 'mail':
        if (mailAction?.email) {
          openMailDialog({
            entityHandle: props.entityHandle,
            itemHandle: item.handle as string | number | undefined,
            draftValues: item,
            initialTo: [mailAction.email],
          })
        }
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

  function patchVisibleTableItem(item: SaplingGenericItem | null | undefined): void {
    const handle = getItemHandle(item)
    if (handle == null) {
      return
    }

    const itemIndex = props.items.findIndex((entry) => getItemHandle(entry) === handle)
    if (itemIndex === -1) {
      return
    }

    props.items.splice(itemIndex, 1, {
      ...props.items[itemIndex],
      ...item,
    })
  }

  function normalizeConcurrencyTimestamp(value: unknown): string | null {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value.toISOString()
    }

    if (typeof value !== 'string' && typeof value !== 'number') {
      return null
    }

    const rawValue = String(value).trim()
    if (!rawValue) {
      return null
    }

    const parsedDate = new Date(rawValue)
    return Number.isNaN(parsedDate.getTime()) ? rawValue : parsedDate.toISOString()
  }

  function buildConcurrencyPayload(
    source: SaplingGenericItem | null,
  ): Record<string, unknown> | null {
    if (!source) {
      return null
    }

    const payload: Record<string, unknown> = {}

    props.entityTemplates.filter(isConcurrencyComparableTemplate).forEach((template) => {
      if (!template.name || !Object.prototype.hasOwnProperty.call(source, template.name)) {
        return
      }

      payload[template.name] = normalizeConcurrencyPayloadValue(source[template.name], template)
    })

    return payload
  }

  function normalizeConcurrencyPayloadValue(value: unknown, template: EntityTemplate): unknown {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value.toISOString()
    }

    if (template.type === 'datetime' && typeof value === 'string') {
      return normalizeConcurrencyTimestamp(value) ?? value
    }

    return value ?? null
  }

  function isConcurrencyComparableTemplate(template: EntityTemplate): boolean {
    if (!template.name || template.isPersistent === false) {
      return false
    }

    if (template.kind === 'm:1') {
      return true
    }

    if (template.isReference) {
      return false
    }

    return !['1:m', 'm:n', 'n:m', '1:1'].includes(template.kind ?? '')
  }

  function buildConcurrencyOptions(source: SaplingGenericItem | null) {
    return {
      expectedUpdatedAt: normalizeConcurrencyTimestamp(source?.updatedAt),
      basePayload: buildConcurrencyPayload(source),
      resolution: 'detect' as const,
    }
  }

  async function saveDialog(
    item: SaplingGenericItem,
    action: DialogSaveAction,
    context?: DialogSaveContext,
  ) {
    if (!props.entityHandle) {
      context?.complete(false)
      return
    }

    let nextDialogItem: SaplingGenericItem | null = null
    let didSave = false
    try {
      if (editDialog.value.mode === 'edit' && editDialog.value.item) {
        const handle = getItemHandle(editDialog.value.item)
        if (handle == null) {
          return
        }

        nextDialogItem = await loadDialogItem(
          await ApiGenericService.update(props.entityHandle, handle, item, {
            concurrency: buildConcurrencyOptions(editDialog.value.item),
            suppressConflictMessage: true,
          }),
        )
        patchVisibleTableItem(nextDialogItem)
      } else if (editDialog.value.mode === 'create') {
        nextDialogItem = await loadDialogItem(
          await ApiGenericService.create(props.entityHandle, item),
        )
      }

      didSave = true
      emit('reload')
      pushMessage(
        'success',
        t('global.recordSaved'),
        t('global.recordSavedDescription'),
        props.entityHandle,
      )

      if (action === 'saveAndClose') {
        closeDialog()
        return
      }

      editDialog.value = {
        visible: true,
        mode: 'edit',
        item: nextDialogItem ?? item,
      }
    } catch (error) {
      const conflict = getGenericUpdateConflict(error)
      if (conflict) {
        updateConflictDialog.value = {
          visible: true,
          conflict,
          draftItem: item,
          action,
          isSaving: false,
        }
      }
    } finally {
      context?.complete(didSave)
    }
  }

  function closeUpdateConflictDialog() {
    updateConflictDialog.value = {
      visible: false,
      conflict: null,
      draftItem: null,
      action: 'save',
      isSaving: false,
    }
  }

  function openUpdateConflictChangeLog() {
    const conflict = updateConflictDialog.value.conflict
    if (!conflict) {
      return
    }

    changeLogDialogStore.openChangeLog(conflict.entityHandle, String(conflict.handle))
  }

  async function reloadUpdateConflictRecord() {
    const conflict = updateConflictDialog.value.conflict
    if (!conflict?.current) {
      closeUpdateConflictDialog()
      return
    }

    const currentItem = await loadDialogItem(conflict.current)
    editDialog.value = {
      visible: true,
      mode: 'edit',
      item: currentItem,
    }
    closeUpdateConflictDialog()
    emit('reload')
  }

  async function mergeUpdateConflict(mergedItem: SaplingGenericItem) {
    const conflictState = updateConflictDialog.value
    const conflict = conflictState.conflict
    if (!conflict || !props.entityHandle || conflictState.isSaving) {
      return
    }

    const handle = getItemHandle(conflict.current) ?? conflict.handle
    if (handle == null) {
      return
    }

    updateConflictDialog.value = {
      ...conflictState,
      isSaving: true,
    }

    try {
      const savedItem = await ApiGenericService.update(props.entityHandle, handle, mergedItem, {
        concurrency: {
          expectedUpdatedAt:
            conflict.currentUpdatedAt ?? normalizeConcurrencyTimestamp(conflict.current?.updatedAt),
          basePayload: buildConcurrencyPayload(conflict.current ?? null),
          resolution: 'detect',
        },
        suppressConflictMessage: true,
      })
      const nextDialogItem = await loadDialogItem(savedItem)
      patchVisibleTableItem(nextDialogItem)

      emit('reload')
      pushMessage(
        'success',
        t('global.recordSaved'),
        t('global.recordSavedDescription'),
        props.entityHandle,
      )

      closeUpdateConflictDialog()

      if (conflictState.action === 'saveAndClose') {
        closeDialog()
        return
      }

      editDialog.value = {
        visible: true,
        mode: 'edit',
        item: nextDialogItem ?? mergedItem,
      }
    } catch (error) {
      const nextConflict = getGenericUpdateConflict(error)
      if (nextConflict) {
        updateConflictDialog.value = {
          ...conflictState,
          visible: true,
          conflict: nextConflict,
          draftItem: mergedItem,
          isSaving: false,
        }
        return
      }

      updateConflictDialog.value = {
        ...conflictState,
        isSaving: false,
      }
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

    try {
      await ApiGenericService.delete(props.entityHandle, handle)
      closeDeleteDialog()
      emit('reload')
      pushMessage(
        'success',
        t('global.recordDeleted'),
        t('global.recordDeletedDescription'),
        props.entityHandle,
      )
    } catch {
      // API errors are already routed through the shared message center.
    }
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

    try {
      for (let index = 0; index < handles.length; index += BULK_DELETE_CONCURRENCY) {
        const batch = handles.slice(index, index + BULK_DELETE_CONCURRENCY)
        await Promise.all(
          batch.map((handle) => ApiGenericService.delete(props.entityHandle, handle)),
        )
      }

      clearSelection()
      closeBulkDeleteDialog()
      emit('reload')
      pushMessage(
        'success',
        t('global.recordsDeleted'),
        t('global.recordsDeletedDescription', { count: handles.length }),
        props.entityHandle,
      )
    } catch {
      // API errors are already routed through the shared message center.
    }
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

    try {
      await ApiGenericService.create<FavoriteItem>('favorite', {
        title: trimmedTitle,
        entity: props.entityHandle,
        entityRoute: getCurrentFavoriteEntityRouteHandle(),
        person: personHandle,
        search: getCurrentFavoriteSearch(),
        sortBy: getCurrentFavoriteSortBy(),
        filter: getCurrentFavoriteFilter(),
      })

      closeFavoriteDialog()
      await loadCurrentEntityFavorites()
      pushMessage(
        'success',
        t('global.favoriteSaved'),
        t('global.favoriteSavedDescription'),
        props.entityHandle,
      )
    } catch {
      // API errors are already routed through the shared message center.
    }
  }

  function getFavoriteEntityTitle() {
    const translationKey = `navigation.${props.entityHandle}`
    const translatedTitle = t(translationKey)
    return translatedTitle !== translationKey
      ? translatedTitle
      : (props.entity?.title ?? props.entityHandle)
  }

  function getCurrentFavoriteFilter() {
    const filter = buildTableFilter({
      search: '',
      columnFilters: localColumnFilters.value,
      entityTemplates: props.entityTemplates,
      parentFilter: props.parentFilter,
    })

    const serializedFilter = JSON.stringify(filter)
    if (serializedFilter === '{}' || serializedFilter === 'null') {
      return undefined
    }

    return JSON.parse(serializedFilter) as FilterQuery
  }

  function getCurrentFavoriteSearch() {
    const trimmedSearch = props.search.trim()
    return trimmedSearch.length > 0 ? trimmedSearch : undefined
  }

  function getCurrentFavoriteSortBy() {
    if (props.sortBy.length === 0) {
      return undefined
    }

    return props.sortBy.map((sort) => ({
      key: sort.key,
      order: sort.order,
    }))
  }

  function getCurrentFavoriteEntityRouteHandle() {
    const tableRoute = props.entity?.routes?.find((entry) => {
      return entry.route === `table/${props.entityHandle}` && entry.handle != null
    })

    return tableRoute?.handle
  }

  const activeFavoriteHandle = computed(() => {
    const currentPath = route.fullPath

    const matchingFavorite = currentEntityFavorites.value.find((favorite) => {
      const favoritePath = buildFavoritePath(favorite)
      return favoritePath === currentPath
    })

    return matchingFavorite?.handle ?? null
  })

  async function selectFavorite(favorite: FavoriteItem) {
    const targetPath = buildFavoritePath(favorite)
    if (!targetPath) {
      return
    }

    await router.push(targetPath)
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
    updateConflictDialog,
    showUploadDialog,
    uploadDialogItem,
    showInformationDialog,
    informationDialogItem,
    contextMenu,
    contextMenuMailActions,
    favoriteDialog,
    currentEntityFavorites,
    isCurrentEntityFavoritesLoading,
    activeFavoriteHandle,
    isDownloadingJSON,
    isImportingCSV,
    downloadJSON,
    exportCSV,
    exportCSVTemplate,
    importCSVFile,
    refreshTable,
    exportSelectedJSON,
    openContextMenu,
    closeContextMenu,
    onContextMenuAction,
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
