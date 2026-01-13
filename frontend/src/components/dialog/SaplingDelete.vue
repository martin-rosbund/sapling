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
      <SaplingDeleteAction
        :handleCancel="handleCancel"
        :handleConfirm="handleConfirm"
      />
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
//#region Imports
import { useSaplingDelete } from '@/composables/dialog/useSaplingDelete'; // Import the composable for delete logic
import SaplingDeleteAction from '@/components/actions/SaplingDeleteAction.vue';
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
