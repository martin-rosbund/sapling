<template>
  <!-- Confirmation dialog for deleting an entity record -->
  <v-dialog :model-value="modelValue" @update:model-value="onDialogUpdate" max-width="400" persistent>
    <v-card>
      <v-card-title>{{ $t('global.confirmDelete') }}</v-card-title>
      <v-card-text>{{ $t('global.confirmDeleteQuestion') }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="cancel">{{ $t('global.cancel') }}</v-btn>
        <v-btn color="error" @click="confirm">{{ $t('global.delete') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
// #region Imports
import type { FormType } from '@/entity/structure';
import { defineProps, defineEmits } from 'vue';
// #endregion

// #region Props and Emits
// Props: dialog visibility and item to delete
defineProps<{
  modelValue: boolean,
  item: FormType | null
}>();
// Emits for dialog state and actions
const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);
// #endregion

// #region Methods
// Handle dialog visibility update
function onDialogUpdate(val: boolean) {
  emit('update:modelValue', val);
}
// Cancel button handler
function cancel() {
  emit('update:modelValue', false);
  emit('cancel');
}
// Confirm (delete) button handler
function confirm() {
  emit('update:modelValue', false);
  emit('confirm');
}
// #endregion
</script>
