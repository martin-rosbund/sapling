import { computed, ref, watch, type CSSProperties, type ComputedRef, type Ref } from 'vue'
import type { SaplingGenericItem, ScriptButtonItem } from '@/entity/entity'
import type { AccumulatedPermission } from '@/entity/structure'

export type SaplingContextMenuTableAction =
  | 'copy'
  | 'delete'
  | 'edit'
  | 'favorite'
  | 'navigate'
  | 'script'
  | 'show'
  | 'showInformation'
  | 'showDocuments'
  | 'timeline'
  | 'uploadDocument'

export interface SaplingContextMenuTableProps {
  canShowInformation: boolean
  entityPermission: AccumulatedPermission | null
  canNavigate: boolean
  scriptButtons?: ScriptButtonItem[]
  item: SaplingGenericItem | null
  show: boolean
  x: number
  y: number
}

export interface SaplingContextMenuTableActionPayload {
  type: SaplingContextMenuTableAction
  item: SaplingGenericItem
  scriptButton?: ScriptButtonItem
}

export interface SaplingContextMenuTableMenuItem {
  type: SaplingContextMenuTableAction
  icon: string
  titleKey?: string
  title?: string
  scriptButton?: ScriptButtonItem
}

export interface SaplingContextMenuTableMenuOptions {
  canShowInformation: boolean
  entityPermission: AccumulatedPermission | null
  canNavigate: boolean
  canTimeline: boolean
  scriptButtons?: ScriptButtonItem[]
}

export interface SaplingContextMenuTableEmit {
  (event: 'action', payload: SaplingContextMenuTableActionPayload): void
  (event: 'update:show', value: boolean): void
}

export interface UseSaplingContextMenuTableResult {
  menuVisible: Ref<boolean>
  menuStyle: ComputedRef<CSSProperties>
  menuItems: ComputedRef<SaplingContextMenuTableMenuItem[]>
  closeMenu: () => void
  emitAction: (type: SaplingContextMenuTableAction, scriptButton?: ScriptButtonItem) => void
}

export function getSaplingContextMenuTableItems(
  options: SaplingContextMenuTableMenuOptions,
): SaplingContextMenuTableMenuItem[] {
  const items: SaplingContextMenuTableMenuItem[] = [
    options.entityPermission?.allowUpdate
      ? { type: 'edit', icon: 'mdi-pencil', titleKey: 'global.edit' }
      : { type: 'show', icon: 'mdi-eye', titleKey: 'global.show' },
    { type: 'favorite', icon: 'mdi-bookmark-plus-outline', titleKey: 'global.saveAsFavorite' },
  ]

  if (options.entityPermission?.allowDelete) {
    items.splice(1, 0, { type: 'delete', icon: 'mdi-delete', titleKey: 'global.delete' })
  }

  if (options.entityPermission?.allowInsert) {
    items.push({ type: 'copy', icon: 'mdi-content-copy', titleKey: 'global.copy' })
  }

  if (options.canTimeline) {
    items.push({ type: 'timeline', icon: 'mdi-timeline-outline', titleKey: 'global.timeline' })
  }

  if (options.canNavigate) {
    items.push({ type: 'navigate', icon: 'mdi-navigation', titleKey: 'global.navigate' })
  }

  if (options.entityPermission?.allowInsert) {
    items.push(
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
    items.push({
      type: 'showInformation',
      icon: 'mdi-text-box-edit-outline',
      titleKey: 'global.showInformation',
    })
  }

  for (const scriptButton of options.scriptButtons ?? []) {
    items.push({
      type: 'script',
      icon: 'mdi-script-text-play-outline',
      title: scriptButton.title,
      scriptButton,
    })
  }

  return items
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

  const menuItems = computed<SaplingContextMenuTableMenuItem[]>(() =>
    getSaplingContextMenuTableItems({
      canShowInformation: props.canShowInformation,
      entityPermission: props.entityPermission,
      canNavigate: props.canNavigate,
      canTimeline: props.item?.handle != null,
      scriptButtons: props.scriptButtons,
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
  function emitAction(type: SaplingContextMenuTableAction, scriptButton?: ScriptButtonItem) {
    if (!props.item) {
      closeMenu()
      return
    }

    emit('action', { type, item: props.item, scriptButton })
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
