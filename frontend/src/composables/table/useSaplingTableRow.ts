// #region Imports
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGenericStore } from '@/stores/genericStore'
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore'
import type { EntityItem, SaplingGenericItem, ScriptButtonItem } from '@/entity/entity'
import type {
  AccumulatedPermission,
  EntityTemplate,
  SaplingTableHeaderItem,
} from '@/entity/structure'
import { i18n } from '@/i18n'
import { getTableHeaders } from '@/utils/saplingTableUtil'
import { NAVIGATION_URL } from '@/constants/project.constants'
import { formatValue } from '@/utils/saplingFormatUtil'
import {
  getSaplingContextMenuTableItems,
  type SaplingContextMenuTableMenuItem,
} from '@/composables/context/useSaplingContextMenuTable'
// #endregion

type ContextMenuAction = {
  type: string
  item: SaplingGenericItem
  scriptButton?: ScriptButtonItem
}

const REFERENCE_COLUMN_KINDS = ['m:1']

export interface UseSaplingTableRowProps {
  item: SaplingGenericItem
  columns: SaplingTableHeaderItem[]
  index: number
  isSelected?: boolean
  multiSelect?: boolean
  entityHandle: string
  entity: EntityItem | null
  entityPermission: AccumulatedPermission | null
  entityTemplates: EntityTemplate[]
  scriptButtons?: ScriptButtonItem[]
  showActions: boolean
}

export type UseSaplingTableRowEmit = {
  (event: 'select-row', value: number): void
  (event: 'edit', value: SaplingGenericItem): void
  (event: 'delete', value: SaplingGenericItem): void
  (event: 'show', value: SaplingGenericItem): void
  (event: 'copy', value: SaplingGenericItem): void
  (event: 'favorite'): void
  (event: 'script', value: { button: ScriptButtonItem; item: SaplingGenericItem }): void
}

const INTERACTIVE_ROW_SELECTOR = [
  'a',
  'button',
  'input',
  'label',
  'select',
  'textarea',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="link"]',
  '[role="menuitem"]',
  '.v-btn',
  '.v-input',
  '.v-selection-control',
].join(', ')

/**
 * Encapsulates row interactions, context menu handling and referenced entity helpers.
 */
export function useSaplingTableRow(props: UseSaplingTableRowProps, emit: UseSaplingTableRowEmit) {
  // #region State
  const genericStore = useGenericStore()
  const currentPermissionStore = useCurrentPermissionStore()
  const router = useRouter()
  const referenceLoadPromises = reactive<Record<string, Promise<void> | undefined>>({})
  const loadedReferences = reactive<Record<string, boolean>>({})

  const showUploadDialog = ref(false)
  const uploadDialogItem = ref<SaplingGenericItem | null>(null)
  const showInformationDialog = ref(false)
  const informationDialogItem = ref<SaplingGenericItem | null>(null)
  const menuActive = ref(false)
  const showDialogMap = ref<Record<string, boolean>>({})
  const contextMenu = reactive({
    show: false,
    x: 0,
    y: 0,
    item: null as SaplingGenericItem | null,
    index: -1,
  })

  const hasActionsColumn = computed(() =>
    props.columns.some((column) => column.key === '__actions'),
  )
  const canNavigate = computed(() =>
    props.entityTemplates.some((template) => template.options?.includes('isNavigation')),
  )
  const scriptButtons = computed(() => props.scriptButtons ?? [])
  const informationPermission = computed(
    () =>
      currentPermissionStore.accumulatedPermission?.find(
        (permission) => permission.entityHandle === 'information',
      ) ?? null,
  )
  const canShowInformation = computed(() => Boolean(informationPermission.value?.allowRead))
  const rowMenuItems = computed<SaplingContextMenuTableMenuItem[]>(() =>
    getSaplingContextMenuTableItems({
      canShowInformation: canShowInformation.value,
      entityPermission: props.entityPermission,
      canNavigate: canNavigate.value,
      canTimeline: props.item?.handle != null,
      scriptButtons: scriptButtons.value,
    }),
  )
  // #endregion

  // #region Lifecycle
  onMounted(() => {
    void loadReferenceData()
    void currentPermissionStore.fetchCurrentPermission()
    window.addEventListener('sapling-contextmenu-open', closeContextMenu)
  })

  onUnmounted(() => {
    window.removeEventListener('sapling-contextmenu-open', closeContextMenu)
  })
  // #endregion

  // #region Watchers
  watch(
    () =>
      props.entityTemplates
        .map((template) => `${template.referenceName ?? ''}:${template.kind ?? ''}`)
        .join('|'),
    () => {
      void loadReferenceData()
    },
  )

  watch(
    () =>
      [
        props.entityHandle,
        props.columns.map((column) => column.referenceName ?? '').join('|'),
      ] as const,
    () => {
      props.columns.forEach((column) => {
        if (column.referenceName) {
          void ensureReferenceData(column.referenceName)
        }
      })
    },
    { immediate: true },
  )
  // #endregion

  // #region Reference Data
  async function loadReferenceData(kinds: string[] = REFERENCE_COLUMN_KINDS) {
    const referenceNames = Array.from(
      new Set(
        props.entityTemplates
          .filter((template) => kinds.includes(template.kind ?? '') && template.referenceName)
          .map((template) => template.referenceName as string),
      ),
    )

    const pendingPromises = referenceNames
      .map((referenceName) => referenceLoadPromises[referenceName])
      .filter((promise): promise is Promise<void> => Boolean(promise))
    const referencesToLoad = referenceNames.filter((referenceName) => {
      const state = genericStore.getState(referenceName)
      if (
        loadedReferences[referenceName] ||
        (state.entityTemplates.length > 0 && !state.isLoading)
      ) {
        loadedReferences[referenceName] = true
        return false
      }

      return !referenceLoadPromises[referenceName]
    })

    if (referencesToLoad.length > 0) {
      const loadPromise = genericStore
        .loadGenericMany(
          referencesToLoad.map((referenceName) => ({
            entityHandle: referenceName,
            namespaces: ['global'],
          })),
        )
        .then(() => {
          referencesToLoad.forEach((referenceName) => {
            loadedReferences[referenceName] = true
          })
        })
        .finally(() => {
          referencesToLoad.forEach((referenceName) => {
            delete referenceLoadPromises[referenceName]
          })
        })

      referencesToLoad.forEach((referenceName) => {
        referenceLoadPromises[referenceName] = loadPromise
      })
      pendingPromises.push(loadPromise)
    }

    if (pendingPromises.length > 0) {
      await Promise.all(pendingPromises)
    }
  }

  async function ensureReferenceData(referenceName?: string): Promise<void> {
    if (!referenceName) {
      return
    }

    const state = genericStore.getState(referenceName)
    if (loadedReferences[referenceName] || (state.entityTemplates.length > 0 && !state.isLoading)) {
      loadedReferences[referenceName] = true
      return
    }

    if (referenceLoadPromises[referenceName]) {
      return referenceLoadPromises[referenceName]
    }

    const promise = genericStore
      .loadGeneric(referenceName, 'global')
      .then(() => {
        loadedReferences[referenceName] = true
      })
      .finally(() => {
        delete referenceLoadPromises[referenceName]
      })

    referenceLoadPromises[referenceName] = promise
    await promise
  }

  function getReferenceState(referenceName?: string) {
    return referenceName ? genericStore.getState(referenceName) : null
  }

  function getReferenceTemplates(referenceName?: string) {
    return getReferenceState(referenceName)?.entityTemplates ?? []
  }

  function getReferenceEntity(referenceName?: string) {
    return getReferenceState(referenceName)?.entity ?? null
  }

  function isReferenceColumn(column: EntityTemplate) {
    return REFERENCE_COLUMN_KINDS.includes(column.kind ?? '') && Boolean(column.referenceName)
  }

  function isReferenceLoading(column: EntityTemplate) {
    if (!column.referenceName) {
      return false
    }

    return (
      getReferenceState(column.referenceName)?.isLoading ??
      Boolean(referenceLoadPromises[column.referenceName])
    )
  }

  function getCompactPanelTitle(column: EntityTemplate, item: SaplingGenericItem): string {
    const key = column.key
    const referenceValue = key ? item[key] : null
    if (!column.referenceName || !referenceValue || typeof referenceValue !== 'object') {
      return ''
    }

    const headers = getTableHeaders(
      getReferenceTemplates(column.referenceName),
      getReferenceEntity(column.referenceName),
      i18n.global.t,
    )

    const valueMap = referenceValue as Record<string, unknown>
    return headers
      .filter((header) => header.options?.includes('isShowInCompact'))
      .map((header) => formatValue(String(valueMap[String(header.key ?? '')] ?? ''), header.type))
      .filter((value) => value && value !== '-')
      .join(' | ')
  }
  // #endregion

  // #region Row Dialogs
  function openDialogForCol(columnKey: string) {
    showDialogMap.value[columnKey] = true
  }

  function closeDialogForCol(columnKey: string) {
    showDialogMap.value[columnKey] = false
  }

  function isDialogOpenForCol(columnKey: string) {
    return Boolean(showDialogMap.value[columnKey])
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
  // #endregion

  // #region Menu and Actions
  function closeMenu() {
    menuActive.value = false
  }

  function closeContextMenu() {
    contextMenu.show = false
  }

  function openContextMenu(event: MouseEvent, item: SaplingGenericItem, index: number) {
    event.preventDefault()
    window.dispatchEvent(new CustomEvent('sapling-contextmenu-open'))
    contextMenu.x = event.clientX
    contextMenu.y = event.clientY
    contextMenu.item = item
    contextMenu.index = index
    contextMenu.show = true
  }

  function onContextMenuAction({ type, item, scriptButton }: ContextMenuAction) {
    switch (type) {
      case 'edit':
        requestEdit(item)
        break
      case 'show':
        requestShow(item)
        break
      case 'delete':
        requestDelete(item)
        break
      case 'navigate':
        requestNavigate(item)
        break
      case 'timeline':
        requestTimeline(item)
        break
      case 'copy':
        requestCopy(item)
        break
      case 'favorite':
        requestFavorite()
        break
      case 'uploadDocument':
        requestUploadDocument(item)
        break
      case 'showDocuments':
        requestShowDocuments(item)
        break
      case 'showInformation':
        requestShowInformation(item)
        break
      case 'script':
        if (scriptButton) {
          requestScript(item, scriptButton)
        }
        break
      default:
        break
    }

    closeContextMenu()
  }

  function isInteractiveRowTarget(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest(INTERACTIVE_ROW_SELECTOR) !== null
  }

  function onRowMouseDown(event: MouseEvent, index: number) {
    if (event.button === 0 && !props.multiSelect && !isInteractiveRowTarget(event.target)) {
      emit('select-row', index)
    }
  }

  function onRowDoubleClick(event: MouseEvent) {
    if (event.button !== 0 || isInteractiveRowTarget(event.target)) {
      return
    }

    if (props.entityPermission?.allowUpdate) {
      requestEdit(props.item)
      return
    }

    requestShow(props.item)
  }

  function toggleRowSelection(index: number) {
    emit('select-row', index)
  }

  function requestEdit(item: SaplingGenericItem) {
    closeMenu()
    emit('edit', item)
  }

  function requestShow(item: SaplingGenericItem) {
    closeMenu()
    emit('show', item)
  }

  function requestDelete(item: SaplingGenericItem) {
    closeMenu()
    emit('delete', item)
  }

  function requestCopy(item: SaplingGenericItem) {
    closeMenu()
    emit('copy', item)
  }

  function requestFavorite() {
    closeMenu()
    emit('favorite')
  }

  function requestScript(item: SaplingGenericItem, scriptButton: ScriptButtonItem) {
    closeMenu()
    emit('script', { button: scriptButton, item })
  }

  function requestNavigate(item: SaplingGenericItem) {
    closeMenu()
    navigateToAddress(item)
  }

  function requestTimeline(item: SaplingGenericItem) {
    closeMenu()

    if (item.handle == null) {
      return
    }

    void router.push(`/timeline/${props.entityHandle}/${String(item.handle)}`)
  }

  function requestUploadDocument(item: SaplingGenericItem) {
    closeMenu()
    openUploadDialog(item)
  }

  function requestShowDocuments(item: SaplingGenericItem) {
    closeMenu()
    navigateToDocuments(item)
  }

  function requestShowInformation(item: SaplingGenericItem) {
    closeMenu()
    openInformationDialog(item)
  }
  // #endregion

  // #region Cell Helpers
  function getNormalizedType(column: EntityTemplate): string {
    return String(column.type ?? '').toLowerCase()
  }

  function isDateTimeColumn(column: EntityTemplate): boolean {
    return getNormalizedType(column) === 'datetime'
  }

  function isDateColumn(column: EntityTemplate): boolean {
    return ['date', 'datetype'].includes(getNormalizedType(column))
  }

  function isTimeColumn(column: EntityTemplate): boolean {
    return getNormalizedType(column) === 'time'
  }

  function getCellValue(
    item: SaplingGenericItem,
    key: string | number | symbol | null | undefined,
  ) {
    if (!key) {
      return null
    }

    const value = item[String(key)]
    if (value == null || typeof value === 'string' || value instanceof Date) {
      return value
    }

    return String(value)
  }

  function getColumnCellClass(column: SaplingTableHeaderItem) {
    const cellProps = (column as { cellProps?: { class?: string } }).cellProps
    return cellProps?.class
  }

  function formatLink(value: string): string {
    if (!value) {
      return ''
    }

    return /^https?:\/\//i.test(value) ? value : `https://${value}`
  }
  // #endregion

  // #region Navigation
  function navigateToAddress(item: SaplingGenericItem) {
    const navigationTemplates = props.entityTemplates.filter((template) =>
      template.options?.includes('isNavigation'),
    )
    if (!navigationTemplates.length) {
      return
    }

    const address = navigationTemplates
      .map((template) => item[template.name || ''])
      .filter(Boolean)
      .join(' ')

    if (!address) {
      return
    }

    const url = `${NAVIGATION_URL}${encodeURIComponent(address)}`
    window.open(url, '_blank')
  }

  function navigateToDocuments(item: SaplingGenericItem) {
    if (item.handle == null) {
      return
    }

    const url = `/file/document?filter={"reference":"${String(item.handle)}","entity":"${props.entityHandle}"}`
    window.open(url, '_blank')
  }

  // #endregion

  // #region Return
  return {
    showUploadDialog,
    uploadDialogItem,
    showInformationDialog,
    informationDialogItem,
    menuActive,
    contextMenu,
    hasActionsColumn,
    canNavigate,
    scriptButtons,
    rowMenuItems,
    canShowInformation,
    openContextMenu,
    onContextMenuAction,
    onRowMouseDown,
    onRowDoubleClick,
    toggleRowSelection,
    openDialogForCol,
    closeDialogForCol,
    isDialogOpenForCol,
    closeMenu,
    requestEdit,
    requestShow,
    requestDelete,
    requestCopy,
    requestFavorite,
    requestScript,
    requestNavigate,
    requestTimeline,
    requestUploadDocument,
    requestShowDocuments,
    requestShowInformation,
    closeUploadDialog,
    closeInformationDialog,
    getReferenceTemplates,
    getReferenceEntity,
    isReferenceColumn,
    isReferenceLoading,
    getCompactPanelTitle,
    isDateTimeColumn,
    isDateColumn,
    isTimeColumn,
    getCellValue,
    getColumnCellClass,
    formatLink,
  }
  // #endregion
}
