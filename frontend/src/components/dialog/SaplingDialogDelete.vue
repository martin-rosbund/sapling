<template>
  <!-- Confirmation dialog for deleting an entity record -->
  <v-dialog
    :model-value="modelValue"
    @update:model-value="handleDialogUpdate"
    class="sapling-dialog-medium"
    persistent
  >
    <v-card class="glass-panel">
      <!-- Dialog title displaying the confirmation message -->
      <v-card-title>{{ $t('global.confirmDelete') }}</v-card-title>
      <!-- Dialog text asking the user for confirmation -->
      <v-card-text>{{ $t('global.confirmDeleteQuestion') }}</v-card-text>
      <SaplingActionDelete
        :handleCancel="handleCancel"
        :handleConfirm="handleConfirm"
      />
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
// #region Imports
import { useSaplingDialogDelete } from '@/composables/dialog/useSaplingDialogDelete';
import SaplingActionDelete from '@/components/actions/SaplingActionDelete.vue';
// #endregion

// #region Props & Emits
defineProps<{
  modelValue: boolean;
  item: unknown | null;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
  (event: 'confirm'): void;
  (event: 'cancel'): void;
}>();
// #endregion

// #region Composable
const {
  handleDialogUpdate,
  handleCancel,
  handleConfirm,
} = useSaplingDialogDelete(emit);
// #endregion
</script>
