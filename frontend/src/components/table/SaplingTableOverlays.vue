<template>
  <SaplingDialogDelete
    persistent
    :model-value="deleteDialog.visible"
    :item="deleteDialog.item"
    @update:model-value="emit('update:delete-visible', $event)"
    @confirm="emit('confirm-delete')"
    @cancel="emit('close-delete')"
  />

  <SaplingDialogDelete
    persistent
    :model-value="bulkDeleteDialog.visible"
    :item="bulkDeleteDialog.items"
    @update:model-value="emit('update:bulk-delete-visible', $event)"
    @confirm="emit('confirm-bulk-delete')"
    @cancel="emit('close-bulk-delete')"
  />

  <SaplingDialogEdit
    :model-value="editDialog.visible"
    :mode="editDialog.mode"
    :item="editDialog.item"
    :parent="parent"
    :parent-entity="parentEntity"
    :templates="entityTemplates"
    :entity="entity"
    :showReference="true"
    @update:model-value="emit('update:edit-visible', $event)"
    @save="(item, action, context) => emit('save-dialog', item, action, context)"
    @cancel="emit('close-dialog')"
    @update:mode="emit('update:edit-mode', $event)"
    @update:item="emit('update:edit-item', $event)"
    @deleted="emit('record-deleted', $event)"
  />

  <SaplingDialogUpdateConflict
    :model-value="updateConflictDialog.visible"
    :conflict="updateConflictDialog.conflict"
    :entity-handle="entityHandle"
    :entity-templates="entityTemplates"
    :is-saving="updateConflictDialog.isSaving"
    @update:model-value="handleUpdateConflictVisibility"
    @merge="emit('merge-update-conflict', $event)"
    @reload="emit('reload-update-conflict')"
    @open-change-log="emit('open-update-conflict-change-log')"
  />

  <SaplingContextMenuTable
    :show="contextMenu.visible"
    :x="contextMenu.x"
    :y="contextMenu.y"
    :item="contextMenu.item"
    :entity-permission="entityPermission"
    :can-navigate="canNavigate"
    :can-show-information="canShowInformation"
    :script-buttons="rowScriptButtons"
    :mail-actions="contextMenuMailActions"
    @action="emit('context-action', $event)"
    @update:show="emit('update:context-visible', $event)"
  />

  <SaplingTableRowUpload
    v-if="showUploadDialog"
    :show="showUploadDialog"
    :item="uploadDialogItem"
    :entityHandle="entityHandle"
    @close="emit('close-upload')"
    @uploaded="emit('close-upload')"
  />

  <SaplingTableRowInformation
    v-if="showInformationDialog"
    :show="showInformationDialog"
    :item="informationDialogItem"
    :entityHandle="entityHandle"
    @close="emit('close-information')"
    @saved="emit('close-information')"
  />

  <SaplingExternalRecordLinksDialog
    v-if="showExternalRecordLinksDialog"
    :show="showExternalRecordLinksDialog"
    :item="externalRecordLinksDialogItem"
    :entity-handle="entityHandle"
    @update:show="(value) => !value && emit('close-external-record-links')"
    @close="emit('close-external-record-links')"
  />
</template>

<script lang="ts" setup>
import type {
  EditDialogOptions,
  DialogSaveAction,
  AccumulatedPermission,
  DialogSaveContext,
  EntityTemplate,
} from '@/entity/structure'
import type { EntityItem, SaplingGenericItem, ScriptButtonItem } from '@/entity/entity'
import type { UpdateConflictDialogState } from '@/composables/table/useSaplingTableActions'
import type {
  SaplingContextMenuTableActionPayload,
  SaplingMailMenuAction,
} from '@/composables/context/useSaplingContextMenuTable'
import SaplingContextMenuTable from '@/components/context/SaplingContextMenuTable.vue'
import SaplingDialogDelete from '@/components/dialog/SaplingDialogDelete.vue'
import SaplingDialogEdit from '@/components/dialog/SaplingDialogEdit.vue'
import SaplingDialogUpdateConflict from '@/components/dialog/SaplingDialogUpdateConflict.vue'
import SaplingExternalRecordLinksDialog from '@/components/import/SaplingExternalRecordLinksDialog.vue'
import SaplingTableRowInformation from './SaplingTableRowInformation.vue'
import SaplingTableRowUpload from './SaplingTableRowUpload.vue'

type DeleteDialogState = {
  visible: boolean
  item: SaplingGenericItem | null
}

type BulkDeleteDialogState = {
  visible: boolean
  items: SaplingGenericItem[]
}

type TableContextMenuState = {
  visible: boolean
  item: SaplingGenericItem | null
  x: number
  y: number
}

defineProps<{
  entity: EntityItem | null
  entityHandle: string
  entityPermission: AccumulatedPermission | null
  entityTemplates: EntityTemplate[]
  parent?: SaplingGenericItem | null
  parentEntity?: EntityItem | null
  rowScriptButtons: ScriptButtonItem[]
  canNavigate: boolean
  canShowInformation: boolean
  editDialog: EditDialogOptions
  deleteDialog: DeleteDialogState
  bulkDeleteDialog: BulkDeleteDialogState
  updateConflictDialog: UpdateConflictDialogState
  contextMenu: TableContextMenuState
  showUploadDialog: boolean
  uploadDialogItem: SaplingGenericItem | null
  showInformationDialog: boolean
  informationDialogItem: SaplingGenericItem | null
  showExternalRecordLinksDialog: boolean
  externalRecordLinksDialogItem: SaplingGenericItem | null
  contextMenuMailActions?: SaplingMailMenuAction[]
}>()

const emit = defineEmits<{
  (event: 'update:delete-visible', value: boolean): void
  (event: 'confirm-delete'): void
  (event: 'close-delete'): void
  (event: 'update:bulk-delete-visible', value: boolean): void
  (event: 'confirm-bulk-delete'): void
  (event: 'close-bulk-delete'): void
  (event: 'update:edit-visible', value: boolean): void
  (
    event: 'save-dialog',
    item: SaplingGenericItem,
    action: DialogSaveAction,
    context: DialogSaveContext,
  ): void
  (event: 'close-dialog'): void
  (event: 'update:edit-mode', value: EditDialogOptions['mode']): void
  (event: 'update:edit-item', value: SaplingGenericItem | null): void
  (event: 'record-deleted', value: SaplingGenericItem | null): void
  (event: 'close-update-conflict'): void
  (event: 'merge-update-conflict', value: SaplingGenericItem): void
  (event: 'reload-update-conflict'): void
  (event: 'open-update-conflict-change-log'): void
  (event: 'context-action', value: SaplingContextMenuTableActionPayload): void
  (event: 'update:context-visible', value: boolean): void
  (event: 'close-upload'): void
  (event: 'close-information'): void
  (event: 'close-external-record-links'): void
}>()

function handleUpdateConflictVisibility(value: boolean): void {
  if (!value) {
    emit('close-update-conflict')
  }
}
</script>
