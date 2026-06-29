<template>
  <!-- Confirmation dialog shown when a form has unsaved changes. -->
  <SaplingDialogConfirm
    :model-value="modelValue"
    :loading="isTranslationLoading"
    :eyebrow="$t('global.unsavedChanges')"
    :title="$t('global.unsavedChanges')"
    persistent
    :close-disabled="isSaving"
    @update:model-value="handleDialogUpdate"
    @enter="handleSaveAndClose"
    @escape="handleKeepEditing"
  >
    <template #body>
      {{ $t('global.unsavedChangesQuestion') }}
    </template>
    <template #actions>
      <SaplingActionUnsavedChanges
        :keep-editing="handleKeepEditing"
        :discard="handleDiscard"
        :save-and-close="handleSaveAndClose"
        :busy="isSaving"
        :save-loading="isSavingAndClosing"
      />
    </template>
  </SaplingDialogConfirm>
</template>

<script lang="ts" setup>
// #region Imports
import SaplingDialogConfirm from '@/components/dialog/SaplingDialogConfirm.vue'
import SaplingActionUnsavedChanges from '@/components/actions/SaplingActionUnsavedChanges.vue'
import { useSaplingDialogUnsavedChanges } from '@/composables/dialog/useSaplingDialogUnsavedChanges'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
// #endregion

// #region Props & Emits
withDefaults(
  defineProps<{
    modelValue: boolean
    isSaving?: boolean
    isSavingAndClosing?: boolean
  }>(),
  {
    isSaving: false,
    isSavingAndClosing: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'keepEditing'): void
  (event: 'discard'): void
  (event: 'saveAndClose'): void
}>()
// #endregion

// #region Composable
const { isLoading: isTranslationLoading } = useTranslationLoader('global')
const { handleDialogUpdate, handleKeepEditing, handleDiscard, handleSaveAndClose } =
  useSaplingDialogUnsavedChanges(emit)
// #endregion
</script>
