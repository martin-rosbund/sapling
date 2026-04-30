// #region Imports
import { computed, ref } from 'vue'
import { useGenericStore } from '@/stores/genericStore'
import type { EntityItem, SaplingGenericItem, ScriptButtonItem } from '@/entity/entity'
import type {
  AccumulatedPermission,
  EntityTemplate,
  SaplingTableHeaderItem,
} from '@/entity/structure'
import { i18n } from '@/i18n'
import { getTableHeaders } from '@/utils/saplingTableUtil'
import { formatValue } from '@/utils/saplingFormatUtil'
import {
  getSaplingContextMenuTableItems,
  type SaplingContextMenuTableMenuItem,
} from '@/composables/context/useSaplingContextMenuTable'
// #endregion

const REFERENCE_COLUMN_KINDS = ['m:1']

export interface SaplingTableRowContextMenuOpenPayload {
  item: SaplingGenericItem
  index: number
  x: number
  y: number
}

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
  canNavigate: boolean
  canShowInformation: boolean
  showActions: boolean
}

export type UseSaplingTableRowEmit = {
  (event: 'select-row', value: number): void
  (event: 'edit', value: SaplingGenericItem): void
  (event: 'delete', value: SaplingGenericItem): void
  (event: 'show', value: SaplingGenericItem): void
  (event: 'copy', value: SaplingGenericItem): void
  (event: 'script', value: { button: ScriptButtonItem; item: SaplingGenericItem }): void
  (event: 'navigate', value: SaplingGenericItem): void
  (event: 'timeline', value: SaplingGenericItem): void
  (event: 'upload-document', value: SaplingGenericItem): void
  (event: 'show-documents', value: SaplingGenericItem): void
  (event: 'show-information', value: SaplingGenericItem): void
  (event: 'open-context-menu', value: SaplingTableRowContextMenuOpenPayload): void
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
  const menuActive = ref(false)
  const showDialogMap = ref<Record<string, boolean>>({})

  const hasActionsColumn = computed(() =>
    props.columns.some((column) => column.key === '__actions'),
  )
  const scriptButtons = computed(() => props.scriptButtons ?? [])
  const rowMenuItems = computed<SaplingContextMenuTableMenuItem[]>(() =>
    getSaplingContextMenuTableItems({
      canShowInformation: props.canShowInformation,
      entityPermission: props.entityPermission,
      canNavigate: props.canNavigate,
      canTimeline: props.item?.handle != null,
      scriptButtons: scriptButtons.value,
    }),
  )
  const referenceCompactHeaders = computed<Record<string, SaplingTableHeaderItem[]>>(() => {
    const referenceNames = Array.from(
      new Set(
        props.columns
          .map((column) => column.referenceName)
          .filter((referenceName): referenceName is string => Boolean(referenceName)),
      ),
    )

    return Object.fromEntries(
      referenceNames.map((referenceName) => [
        referenceName,
        getTableHeaders(
          getReferenceTemplates(referenceName),
          getReferenceEntity(referenceName),
          i18n.global.t,
        ).filter((header) => header.options?.includes('isShowInCompact')),
      ]),
    )
  })
  const compactPanelTitles = computed<Record<string, string>>(() => {
    const titles: Record<string, string> = {}

    for (const column of props.columns) {
      const columnKey = column.key
      if (!columnKey || !isReferenceColumn(column)) {
        continue
      }

      const referenceValue = props.item[columnKey]
      if (!column.referenceName || !referenceValue || typeof referenceValue !== 'object') {
        titles[columnKey] = ''
        continue
      }

      const valueMap = referenceValue as Record<string, unknown>
      titles[columnKey] = (referenceCompactHeaders.value[column.referenceName] ?? [])
        .map((header) => formatValue(String(valueMap[String(header.key ?? '')] ?? ''), header.type))
        .filter((value) => value && value !== '-')
        .join(' | ')
    }

    return titles
  })
  // #endregion

  // #region Reference Data
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

    return getReferenceState(column.referenceName)?.isLoading ?? false
  }

  function getCompactPanelTitle(columnKey: string): string {
    return compactPanelTitles.value[columnKey] ?? ''
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

  // #endregion

  // #region Menu and Actions
  function closeMenu() {
    menuActive.value = false
  }

  function openContextMenu(event: MouseEvent, item: SaplingGenericItem, index: number) {
    emit('open-context-menu', {
      item,
      index,
      x: event.clientX,
      y: event.clientY,
    })
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

  function requestScript(item: SaplingGenericItem, scriptButton: ScriptButtonItem) {
    closeMenu()
    emit('script', { button: scriptButton, item })
  }

  function requestNavigate(item: SaplingGenericItem) {
    closeMenu()
    emit('navigate', item)
  }

  function requestTimeline(item: SaplingGenericItem) {
    closeMenu()
    emit('timeline', item)
  }

  function requestUploadDocument(item: SaplingGenericItem) {
    closeMenu()
    emit('upload-document', item)
  }

  function requestShowDocuments(item: SaplingGenericItem) {
    closeMenu()
    emit('show-documents', item)
  }

  function requestShowInformation(item: SaplingGenericItem) {
    closeMenu()
    emit('show-information', item)
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

  // #region Return
  return {
    menuActive,
    hasActionsColumn,
    scriptButtons,
    rowMenuItems,
    openContextMenu,
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
    requestScript,
    requestNavigate,
    requestTimeline,
    requestUploadDocument,
    requestShowDocuments,
    requestShowInformation,
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
