<template>
  <!-- Confirmation dialog for deleting an entity record -->
  <v-dialog
    :model-value="modelValue"
    @update:model-value="handleDialogUpdate"
    class="sapling-dialog-medium"
    persistent
  >
    <v-card
      class="glass-panel tilt-content sapling-dialog-delete-card"
      v-tilt="TILT_DEFAULT_OPTIONS"
      elevation="12"
    >
      <div class="sapling-dialog-shell">
        <template v-if="isTranslationLoading">
          <SaplingDialogHero variant="danger" loading />
          <div class="sapling-dialog__footer">
            <v-card-actions class="sapling-dialog__actions">
              <v-skeleton-loader type="button" width="112" />
              <v-spacer />
              <v-skeleton-loader type="button" width="112" />
            </v-card-actions>
          </div>
        </template>
        <template v-else>
          <SaplingDialogHero
            variant="danger"
            :eyebrow="$t('global.confirmDelete')"
            :title="$t('global.confirmDelete')"
            :subtitle="$t('global.confirmDeleteQuestion')"
          />
          <SaplingActionDelete :handleCancel="handleCancel" :handleConfirm="handleConfirm" />
        </template>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
// #region Imports
import { useSaplingDialogDelete } from '@/composables/dialog/useSaplingDialogDelete'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import SaplingActionDelete from '@/components/actions/SaplingActionDelete.vue'
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
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
