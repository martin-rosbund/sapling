import { computed, ref, watch, type CSSProperties, type ComputedRef, type Ref } from 'vue'
import type { SaplingGenericItem, ScriptButtonItem } from '@/entity/entity'
import type { AccumulatedPermission } from '@/entity/structure'

export type SaplingContextMenuTableAction =
  | 'changeLog'
  | 'copy'
  | 'delete'
  | 'edit'
  | 'mail'
  | 'navigate'
  | 'script'
  | 'show'
  | 'showInformation'
  | 'showDocuments'
  | 'timeline'
  | 'uploadDocument'

export interface SaplingMailMenuAction {
  templateName: string
  email: string
  fieldLabel?: string
}

export interface SaplingContextMenuTableProps {
  canShowInformation: boolean
  entityPermission: AccumulatedPermission | null
  canNavigate: boolean
  scriptButtons?: ScriptButtonItem[]
  mailActions?: SaplingMailMenuAction[]
  showEdit?: boolean
  item: SaplingGenericItem | null
  show: boolean
  x: number
  y: number
}

export interface SaplingContextMenuTableActionPayload {
  type: SaplingContextMenuTableAction
  item: SaplingGenericItem
  scriptButton?: ScriptButtonItem
  mailAction?: SaplingMailMenuAction
}

export interface SaplingContextMenuTableMenuItem {
  type: SaplingContextMenuTableAction
  icon: string
  titleKey?: string
  title?: string
  scriptButton?: ScriptButtonItem
  mailAction?: SaplingMailMenuAction
}

export type SaplingContextMenuTableMenuGroup = SaplingContextMenuTableMenuItem[]
export type SaplingContextMenuTableMenuEntry =
  | SaplingContextMenuTableMenuItem
  | SaplingContextMenuTableMenuGroup

export interface SaplingContextMenuTableMenuOptions {
  canChangeLog: boolean
  canShowInformation: boolean
  entityPermission: AccumulatedPermission | null
  canNavigate: boolean
  canTimeline: boolean
  scriptButtons?: ScriptButtonItem[]
  mailActions?: SaplingMailMenuAction[]
  mailToLabel?: string
  showEdit?: boolean
}

export interface SaplingContextMenuTableEmit {
  (event: 'action', payload: SaplingContextMenuTableActionPayload): void
  (event: 'update:show', value: boolean): void
}

export interface UseSaplingContextMenuTableResult {
  menuVisible: Ref<boolean>
  menuStyle: ComputedRef<CSSProperties>
  menuItems: ComputedRef<SaplingContextMenuTableMenuEntry[]>
  closeMenu: () => void
  emitAction: (
    type: SaplingContextMenuTableAction,
    scriptButton?: ScriptButtonItem,
    mailAction?: SaplingMailMenuAction,
  ) => void
}

export function getSaplingContextMenuTableItems(
  options: SaplingContextMenuTableMenuOptions,
): SaplingContextMenuTableMenuEntry[] {
  // Gruppierung: Standardaktionen, Zeitachsen/Navigate, Dokumente/Information, Skript/Mail
  const group1: SaplingContextMenuTableMenuItem[] = []
  if (options.showEdit !== false) {
    group1.push(
      options.entityPermission?.allowUpdate
        ? { type: 'edit', icon: 'mdi-pencil', titleKey: 'global.edit' }
        : { type: 'show', icon: 'mdi-eye', titleKey: 'global.show' },
    )
  }
  if (options.entityPermission?.allowDelete) {
    group1.push({ type: 'delete', icon: 'mdi-delete', titleKey: 'global.delete' })
  }
  if (options.entityPermission?.allowInsert) {
    group1.push({ type: 'copy', icon: 'mdi-content-copy', titleKey: 'global.copy' })
  }

  const group2: SaplingContextMenuTableMenuItem[] = []
  if (options.canTimeline) {
    group2.push({ type: 'timeline', icon: 'mdi-timeline-outline', titleKey: 'global.timeline' })
  }
  if (options.canChangeLog) {
    group2.push({ type: 'changeLog', icon: 'mdi-history', titleKey: 'global.changeLog' })
  }
  if (options.canNavigate) {
    group2.push({ type: 'navigate', icon: 'mdi-navigation', titleKey: 'global.navigate' })
  }

  const group3: SaplingContextMenuTableMenuItem[] = []
  if (options.entityPermission?.allowInsert) {
    group3.push(
      {
        type: 'uploadDocument',
        icon: 'mdi-file-document-arrow-right',
        titleKey: 'global.uploadDocument',
      },
      {
        type: 'showDocuments',
        icon: 'mdi-file-document-multiple',
        titleKey: 'global.showDocuments',
      },
    )
  }
  if (options.canShowInformation) {
    group3.push({
      type: 'showInformation',
      icon: 'mdi-text-box-edit-outline',
      titleKey: 'global.showInformation',
    })
  }

  const group4: SaplingContextMenuTableMenuItem[] = []
  for (const scriptButton of options.scriptButtons ?? []) {
    group4.push({
      type: 'script',
      icon: 'mdi-script-text-play-outline',
      title: scriptButton.title,
      scriptButton,
    })
  }
  const mailToLabel = options.mailToLabel ?? 'E-Mail an'
  for (const mailAction of options.mailActions ?? []) {
    group4.push({
      type: 'mail',
      icon: 'mdi-email-fast-outline',
      title: `${mailToLabel} ${mailAction.email}`,
      mailAction,
    })
  }

  // Filter leere Gruppen raus
  const groups = [group1, group2, group3, group4].filter((group) => group.length > 0)
  return groups
}

/**
 * Encapsulates all state and actions for the table row context menu.
 * Synchronizes the floating menu position with component props.
 */
export function useSaplingContextMenuTable(
  props: SaplingContextMenuTableProps,
  emit: SaplingContextMenuTableEmit,
): UseSaplingContextMenuTableResult {
  //#region State
  const menuVisible = ref(Boolean(props.show))
  const x = ref(props.x)
  const y = ref(props.y)

  const menuStyle = computed<CSSProperties>(() => ({
    top: `${y.value}px`,
    left: `${x.value}px`,
  }))

  const menuItems = computed<SaplingContextMenuTableMenuEntry[]>(() =>
    getSaplingContextMenuTableItems({
      canChangeLog: props.item?.handle != null,
      canShowInformation: props.canShowInformation,
      entityPermission: props.entityPermission,
      canNavigate: props.canNavigate,
      canTimeline: props.item?.handle != null,
      scriptButtons: props.scriptButtons,
      mailActions: props.mailActions,
      showEdit: props.showEdit,
    }),
  )
  //#endregion

  //#region Lifecycle
  watch(
    () => props.show,
    (value) => {
      const nextValue = Boolean(value)

      if (menuVisible.value !== nextValue) {
        menuVisible.value = nextValue
      }
    },
    { immediate: true },
  )

  watch(
    () => props.x,
    (value) => {
      x.value = value
    },
    { immediate: true },
  )

  watch(
    () => props.y,
    (value) => {
      y.value = value
    },
    { immediate: true },
  )

  watch(menuVisible, (value) => {
    emit('update:show', value)
  })
  //#endregion

  //#region Methods
  /**
   * Closes the menu without emitting a table action.
   */
  function closeMenu() {
    menuVisible.value = false
  }

  /**
   * Emits the selected table menu action and closes the menu immediately.
   */
  function emitAction(
    type: SaplingContextMenuTableAction,
    scriptButton?: ScriptButtonItem,
    mailAction?: SaplingMailMenuAction,
  ) {
    if (!props.item) {
      closeMenu()
      return
    }

    emit('action', { type, item: props.item, scriptButton, mailAction })
    closeMenu()
  }
  //#endregion

  //#region Return
  return {
    menuVisible,
    menuStyle,
    menuItems,
    closeMenu,
    emitAction,
  }
  //#endregion
}
