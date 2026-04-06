import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { EntityItem } from '@/entity/entity';
import type { AccumulatedPermission } from '@/entity/structure';
import { SaplingWindowWatcher } from '@/utils/saplingWindowWatcher';

export interface UseSaplingTableMultiSelectProps {
  multiSelect: boolean;
  selectedRows: number[];
  showActions: boolean;
  entity: EntityItem | null;
  entityPermission: AccumulatedPermission | null;
}

export type UseSaplingTableMultiSelectEmit = {
  (event: 'clearSelection'): void;
  (event: 'deleteAllSelected'): void;
  (event: 'exportSelected'): void;
  (event: 'selectAll'): void;
};

/**
 * Handles the responsive action bar behaviour for table multi selection.
 */
export function useSaplingTableMultiSelect(
  props: UseSaplingTableMultiSelectProps,
  emit: UseSaplingTableMultiSelectEmit,
) {
  // #region State
  const showActionsInline = ref(true);
  const selectedCount = computed(() => props.selectedRows.length);
  const canClearSelection = computed(() => selectedCount.value > 0);
  const canExportSelection = computed(() => canClearSelection.value);
  const canSelectAll = computed(() => props.showActions);
  const canDeleteSelection = computed(() =>
    canClearSelection.value
    && props.showActions
    && props.entity?.canDelete
    && props.entityPermission?.allowDelete,
  );

  let windowWatcher: SaplingWindowWatcher | null = null;
  let removeWindowListener: (() => void) | null = null;
  // #endregion

  // #region Lifecycle
  onMounted(() => {
    windowWatcher = new SaplingWindowWatcher();
    removeWindowListener = windowWatcher.onChange((size) => {
      showActionsInline.value = size !== 'small';
    });
  });

  onUnmounted(() => {
    removeWindowListener?.();
    windowWatcher?.destroy();
    removeWindowListener = null;
    windowWatcher = null;
  });
  // #endregion

  // #region Actions
  function clearSelection() {
    emit('clearSelection');
  }

  function deleteAllSelected() {
    emit('deleteAllSelected');
  }

  function exportSelected() {
    emit('exportSelected');
  }

  function selectAll() {
    emit('selectAll');
  }
  // #endregion

  // #region Return
  return {
    showActionsInline,
    selectedCount,
    canClearSelection,
    canExportSelection,
    canSelectAll,
    canDeleteSelection,
    clearSelection,
    deleteAllSelected,
    exportSelected,
    selectAll,
  };
  // #endregion
}