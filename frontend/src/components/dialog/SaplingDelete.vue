<template>
  <!-- Confirmation dialog for deleting an entity record -->
  <v-dialog
    :model-value="modelValue"
    @update:model-value="handleDialogUpdate"
    class="sapling-delete-dialog"
    persistent
  >
    <v-card class="glass-panel">
      <!-- Dialog title displaying the confirmation message -->
      <v-card-title>{{ $t('global.confirmDelete') }}</v-card-title>
      <!-- Dialog text asking the user for confirmation -->
      <v-card-text>{{ $t('global.confirmDeleteQuestion') }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <!-- Cancel button to close the dialog without confirming -->
        <v-btn text @click="handleCancel">{{ $t('global.cancel') }}</v-btn>
        <!-- Confirm button to proceed with the deletion -->
        <v-btn color="error" @click="handleConfirm">{{ $t('global.delete') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
//#region Imports
import { defineProps, defineEmits } from 'vue'; // Import Vue functions for props and emits
import { useSaplingDelete } from '@/composables/dialog/useSaplingDelete'; // Import the composable for delete logic
import '@/assets/styles/SaplingDelete.css'; // Import the CSS file for styling the delete component
import type { PersonItem } from '@/entity/entity';
//#endregion

//#region Props and Emits
// Define the props for the component
const props = defineProps<{
  modelValue: boolean; // Boolean to control the visibility of the dialog
  item: object | null; // The item to be deleted
}>();

// Define the events emitted by the component
const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);
//#endregion

//#region Composable
// Destructure the methods and properties from the useSaplingDelete composable
const {
  onDialogUpdate, // Method to handle dialog visibility updates
  cancel, // Method to handle cancel action
  confirm, // Method to handle confirm action
} = useSaplingDelete(props.modelValue, props.item);
//#endregion

//#region Methods
// Method to handle dialog visibility updates
function handleDialogUpdate(val: boolean) {
  onDialogUpdate(val, emit);
}

// Method to handle the cancel action
function handleCancel() {
  cancel(emit, () => emit('cancel'));
}

// Method to handle the confirm action
function handleConfirm() {
  confirm(emit, () => emit('confirm'));
}
//#endregion
</script>
