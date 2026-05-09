<template>
  <!-- Confirmation dialog shown when a form has unsaved changes. -->
  <SaplingDialogConfirm
    :model-value="modelValue"
    :loading="isTranslationLoading"
    :eyebrow="$t('global.unsavedChanges')"
    :title="$t('global.unsavedChanges')"
    persistent
    @update:model-value="handleDialogUpdate"
  >
    <template #body>
      {{ $t('global.unsavedChangesQuestion') }}
    </template>
    <template #actions>
      <div class="sapling-dialog__footer">
        <v-card-actions class="sapling-dialog__actions">
          <v-btn
            variant="text"
            prepend-icon="mdi-pencil"
            :disabled="isSaving"
            @click="handleKeepEditing"
          >
            {{ $t('global.keepEditing') }}
          </v-btn>
          <v-spacer />
          <v-btn
            variant="text"
            color="warning"
            prepend-icon="mdi-delete-outline"
            :disabled="isSaving"
            @click="handleDiscard"
          >
            {{ $t('global.discardChanges') }}
          </v-btn>
          <v-btn
            color="primary"
            append-icon="mdi-content-save-check"
            :loading="isSavingAndClosing"
            :disabled="isSaving"
            @click="handleSaveAndClose"
          >
            {{ $t('global.saveAndClose') }}
          </v-btn>
        </v-card-actions>
      </div>
    </template>
  </SaplingDialogConfirm>
</template>

<script lang="ts" setup>
// #region Imports
import SaplingDialogConfirm from '@/components/dialog/SaplingDialogConfirm.vue'
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
