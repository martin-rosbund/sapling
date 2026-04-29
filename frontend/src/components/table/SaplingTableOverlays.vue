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
    @save="(item, action) => emit('save-dialog', item, action)"
    @cancel="emit('close-dialog')"
    @update:mode="emit('update:edit-mode', $event)"
    @update:item="emit('update:edit-item', $event)"
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
</template>

<script lang="ts" setup>
import type {
  EditDialogOptions,
  DialogSaveAction,
  AccumulatedPermission,
  EntityTemplate,
} from '@/entity/structure'
import type { EntityItem, SaplingGenericItem, ScriptButtonItem } from '@/entity/entity'
import type { SaplingContextMenuTableActionPayload } from '@/composables/context/useSaplingContextMenuTable'
import SaplingContextMenuTable from '@/components/context/SaplingContextMenuTable.vue'
import SaplingDialogDelete from '@/components/dialog/SaplingDialogDelete.vue'
import SaplingDialogEdit from '@/components/dialog/SaplingDialogEdit.vue'
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
  contextMenu: TableContextMenuState
  showUploadDialog: boolean
  uploadDialogItem: SaplingGenericItem | null
  showInformationDialog: boolean
  informationDialogItem: SaplingGenericItem | null
}>()

const emit = defineEmits<{
  (event: 'update:delete-visible', value: boolean): void
  (event: 'confirm-delete'): void
  (event: 'close-delete'): void
  (event: 'update:bulk-delete-visible', value: boolean): void
  (event: 'confirm-bulk-delete'): void
  (event: 'close-bulk-delete'): void
  (event: 'update:edit-visible', value: boolean): void
  (event: 'save-dialog', item: SaplingGenericItem, action: DialogSaveAction): void
  (event: 'close-dialog'): void
  (event: 'update:edit-mode', value: EditDialogOptions['mode']): void
  (event: 'update:edit-item', value: SaplingGenericItem | null): void
  (event: 'context-action', value: SaplingContextMenuTableActionPayload): void
  (event: 'update:context-visible', value: boolean): void
  (event: 'close-upload'): void
  (event: 'close-information'): void
}>()
</script>
