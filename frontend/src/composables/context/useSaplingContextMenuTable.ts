import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type CSSProperties,
  type ComputedRef,
  type Ref,
} from 'vue';
import type { SaplingGenericItem } from '@/entity/entity';
import type { AccumulatedPermission } from '@/entity/structure';

export const SAPLING_CONTEXT_MENU_OPEN_EVENT = 'sapling-contextmenu-open';

export type SaplingContextMenuTableAction =
  | 'copy'
  | 'delete'
  | 'edit'
  | 'favorite'
  | 'navigate'
  | 'show'
  | 'showDocuments'
  | 'uploadDocument';

export interface SaplingContextMenuTableProps {
  entityPermission: AccumulatedPermission | null;
  canNavigate: boolean;
  item: SaplingGenericItem | null;
  show: boolean;
  x: number;
  y: number;
}

export interface SaplingContextMenuTableActionPayload {
  type: SaplingContextMenuTableAction;
  item: SaplingGenericItem;
}

export interface SaplingContextMenuTableMenuItem {
  type: SaplingContextMenuTableAction;
  icon: string;
  titleKey: string;
}

export interface SaplingContextMenuTableEmit {
  (event: 'action', payload: SaplingContextMenuTableActionPayload): void;
  (event: 'update:show', value: boolean): void;
}

export interface UseSaplingContextMenuTableResult {
  menuVisible: Ref<boolean>;
  menuStyle: ComputedRef<CSSProperties>;
  menuItems: ComputedRef<SaplingContextMenuTableMenuItem[]>;
  closeMenu: () => void;
  emitAction: (type: SaplingContextMenuTableAction) => void;
}

/**
 * Encapsulates all state and actions for the table row context menu.
 * Synchronizes the floating menu position with component props and coordinates
 * multiple open menus through a shared browser event.
 */
export function useSaplingContextMenuTable(
  props: SaplingContextMenuTableProps,
  emit: SaplingContextMenuTableEmit,
): UseSaplingContextMenuTableResult {
  //#region State
  const menuVisible = ref(Boolean(props.show));
  const x = ref(props.x);
  const y = ref(props.y);

  const menuStyle = computed<CSSProperties>(() => ({
    top: `${y.value}px`,
    left: `${x.value}px`,
  }));

  const menuItems = computed<SaplingContextMenuTableMenuItem[]>(() => {
    const items: SaplingContextMenuTableMenuItem[] = [
      props.entityPermission?.allowUpdate
        ? { type: 'edit', icon: 'mdi-pencil', titleKey: 'global.edit' }
        : { type: 'show', icon: 'mdi-eye', titleKey: 'global.show' },
      { type: 'favorite', icon: 'mdi-bookmark-plus-outline', titleKey: 'global.saveAsFavorite' },
    ];

    if (props.entityPermission?.allowDelete) {
      items.splice(1, 0, { type: 'delete', icon: 'mdi-delete', titleKey: 'global.delete' });
    }

    if (props.entityPermission?.allowInsert) {
      items.push({ type: 'copy', icon: 'mdi-content-copy', titleKey: 'global.copy' });
    }

    if (props.canNavigate) {
      items.push({ type: 'navigate', icon: 'mdi-navigation', titleKey: 'global.navigate' });
    }

    if (props.entityPermission?.allowInsert) {
      items.push(
        { type: 'uploadDocument', icon: 'mdi-file-document-arrow-right', titleKey: 'global.uploadDocument' },
        { type: 'showDocuments', icon: 'mdi-file-document-multiple', titleKey: 'global.showDocuments' },
      );
    }

    return items;
  });
  //#endregion

  //#region Lifecycle
  watch(
    () => props.show,
    (value) => {
      const nextValue = Boolean(value);

      if (menuVisible.value !== nextValue) {
        menuVisible.value = nextValue;
      }
    },
    { immediate: true },
  );

  watch(
    () => props.x,
    (value) => {
      x.value = value;
    },
    { immediate: true },
  );

  watch(
    () => props.y,
    (value) => {
      y.value = value;
    },
    { immediate: true },
  );

  watch(menuVisible, (value, previousValue) => {
    emit('update:show', value);

    if (value && !previousValue) {
      dispatchContextMenuOpenEvent();
    }
  });

  onMounted(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener(SAPLING_CONTEXT_MENU_OPEN_EVENT, onGlobalMenuOpen);
  });

  onUnmounted(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.removeEventListener(SAPLING_CONTEXT_MENU_OPEN_EVENT, onGlobalMenuOpen);
  });
  //#endregion

  //#region Methods
  /**
   * Closes the menu without emitting a table action.
   */
  function closeMenu() {
    menuVisible.value = false;
  }

  /**
   * Emits the selected table menu action and closes the menu immediately.
   */
  function emitAction(type: SaplingContextMenuTableAction) {
    if (!props.item) {
      closeMenu();
      return;
    }

    emit('action', { type, item: props.item });
    closeMenu();
  }

  /**
   * Ensures already open context menus close when another one becomes active.
   */
  function onGlobalMenuOpen() {
    if (menuVisible.value) {
      closeMenu();
    }
  }

  /**
   * Broadcasts that a context menu has just been opened.
   */
  function dispatchContextMenuOpenEvent() {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(new CustomEvent(SAPLING_CONTEXT_MENU_OPEN_EVENT));
  }
  //#endregion

  //#region Return
  return {
    menuVisible,
    menuStyle,
    menuItems,
    closeMenu,
    emitAction,
  };
  //#endregion
}