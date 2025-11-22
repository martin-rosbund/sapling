//#region Imports
import { ref } from 'vue'; // Import Vue's ref function for creating reactive variables
import type { PersonItem } from '@/entity/entity';
//#endregion

//#region Composable Definition
// Define the useSaplingDelete composable for managing delete dialog state and actions
export function useSaplingDelete(initialVisible = false, initialItem: object | null = null) {
  //#region State
  // Reactive property to control the visibility of the dialog
  const modelValue = ref<boolean>(initialVisible);

  // Reactive property to store the item to be deleted
  const item = ref<object | null>(initialItem);
  //#endregion

  //#region Methods
  // Method to handle dialog visibility updates
  function onDialogUpdate(
    val: boolean,
    emit: (event: 'update:modelValue', value: boolean) => void
  ) {
    emit('update:modelValue', val);
  }

  // Method to handle the cancel action
  function cancel(
    emit: (event: 'update:modelValue', value: boolean) => void,
    emitCancel: () => void
  ) {
    emit('update:modelValue', false); // Close the dialog
    emitCancel(); // Emit the cancel event
  }

  // Method to handle the confirm action
  function confirm(
    emit: (event: 'update:modelValue', value: boolean) => void,
    emitConfirm: () => void
  ) {
    emit('update:modelValue', false); // Close the dialog
    emitConfirm(); // Emit the confirm event
  }
  //#endregion

  //#region Return
  // Return all reactive properties and methods for use in components
  return {
    modelValue,
    item,
    onDialogUpdate,
    cancel,
    confirm,
  };
  //#endregion
}
//#endregion
