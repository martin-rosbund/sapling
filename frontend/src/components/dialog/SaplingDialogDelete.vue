<template>
  <!-- Confirmation dialog for deleting an entity record -->
  <SaplingDialogConfirm
    :model-value="modelValue"
    variant="danger"
    :loading="isTranslationLoading"
    :eyebrow="$t('global.confirmDelete')"
    :title="$t('global.confirmDelete')"
    :subtitle="$t('global.confirmDeleteQuestion')"
    card-class="tilt-content sapling-dialog-delete-card"
    persistent
    @update:model-value="handleDialogUpdate"
  >
    <template #actions>
      <SaplingActionDelete :handleCancel="handleCancel" :handleConfirm="handleConfirm" />
    </template>
  </SaplingDialogConfirm>
</template>

<script lang="ts" setup>
// #region Imports
import { useSaplingDialogDelete } from '@/composables/dialog/useSaplingDialogDelete'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import SaplingActionDelete from '@/components/actions/SaplingActionDelete.vue'
import SaplingDialogConfirm from '@/components/dialog/SaplingDialogConfirm.vue'
// #endregion

// #region Props & Emits
defineProps<{
  modelValue: boolean
  item: unknown | null
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'confirm'): void
  (event: 'cancel'): void
}>()
// #endregion

// #region Composable
const { isLoading: isTranslationLoading } = useTranslationLoader('global')
const { handleDialogUpdate, handleCancel, handleConfirm } = useSaplingDialogDelete(emit)
// #endregion
</script>
