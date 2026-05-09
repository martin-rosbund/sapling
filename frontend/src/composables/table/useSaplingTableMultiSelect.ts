import { computed } from 'vue'
import type { EntityItem, SaplingGenericItem, ScriptButtonItem } from '@/entity/entity'
import type { AccumulatedPermission, EntityTemplate } from '@/entity/structure'
import {
  buildBulkMailActions,
  type SaplingBulkMailAction,
} from '@/utils/saplingMailMenuUtil'

export interface UseSaplingTableMultiSelectProps {
  multiSelect: boolean
  selectedRows: number[]
  selectedItems?: SaplingGenericItem[]
  entityTemplates?: EntityTemplate[]
  scriptButtons?: ScriptButtonItem[]
  showActions: boolean
  entity: EntityItem | null
  entityPermission: AccumulatedPermission | null
}

export type UseSaplingTableMultiSelectEmit = {
  (event: 'clearSelection'): void
  (event: 'deleteAllSelected'): void
  (event: 'exportSelected'): void
  (event: 'runScriptButton', value: ScriptButtonItem): void
  (event: 'selectAll'): void
  (event: 'mailToSelected', value: SaplingBulkMailAction): void
}

/**
 * Handles the responsive action bar behaviour for table multi selection.
 */
export function useSaplingTableMultiSelect(
  props: UseSaplingTableMultiSelectProps,
  emit: UseSaplingTableMultiSelectEmit,
) {
  // #region State
  const selectedCount = computed(() => props.selectedRows.length)
  const canClearSelection = computed(() => selectedCount.value > 0)
  const canExportSelection = computed(() => canClearSelection.value)
  const canSelectAll = computed(() => props.showActions)
  const scriptButtons = computed(() => props.scriptButtons ?? [])
  const canRunScriptButtons = computed(
    () => canClearSelection.value && scriptButtons.value.length > 0,
  )
  const canDeleteSelection = computed(
    () =>
      canClearSelection.value &&
      props.showActions &&
      props.entity?.canDelete &&
      props.entityPermission?.allowDelete,
  )
  const bulkMailActions = computed<SaplingBulkMailAction[]>(() =>
    canClearSelection.value
      ? buildBulkMailActions(props.entityTemplates, props.selectedItems)
      : [],
  )
  const canMailSelection = computed(() => bulkMailActions.value.length > 0)
  const hasSelectionActions = computed(
    () =>
      canClearSelection.value ||
      canExportSelection.value ||
      canSelectAll.value ||
      canRunScriptButtons.value ||
      canDeleteSelection.value ||
      canMailSelection.value,
  )
  // #endregion

  // #region Actions
  function clearSelection() {
    emit('clearSelection')
  }

  function deleteAllSelected() {
    emit('deleteAllSelected')
  }

  function exportSelected() {
    emit('exportSelected')
  }

  function runScriptButton(button: ScriptButtonItem) {
    emit('runScriptButton', button)
  }

  function selectAll() {
    emit('selectAll')
  }

  function mailToSelected(action: SaplingBulkMailAction) {
    emit('mailToSelected', action)
  }
  // #endregion

  // #region Return
  return {
    selectedCount,
    hasSelectionActions,
    canClearSelection,
    canExportSelection,
    canSelectAll,
    canRunScriptButtons,
    canDeleteSelection,
    canMailSelection,
    bulkMailActions,
    scriptButtons,
    clearSelection,
    deleteAllSelected,
    exportSelected,
    runScriptButton,
    selectAll,
    mailToSelected,
  }
  // #endregion
}
