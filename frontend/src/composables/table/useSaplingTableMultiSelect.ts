import { computed } from 'vue';
import type { EntityItem } from '@/entity/entity';
import type { AccumulatedPermission } from '@/entity/structure';

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
  const hasSelectionActions = computed(() =>
    canClearSelection.value
    || canExportSelection.value
    || canSelectAll.value
    || canDeleteSelection.value,
  );
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
    selectedCount,
    hasSelectionActions,
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