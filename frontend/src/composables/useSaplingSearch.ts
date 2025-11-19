import { ref, watch } from 'vue';

/**
 * Composable for managing the search input logic.
 * @param initialValue - The initial value of the search input.
 * @param emit - The emit function to communicate with the parent component.
 */
export function useSaplingSearch(initialValue: string, emit: (event: 'update:model-value', value: string) => void) {
  //#region State
  // Local reactive state for the search input field
  const localSearch = ref(initialValue);
  //#endregion

  //#region Watchers
  // Watch for changes in the initial value and update the local state accordingly
  watch(() => initialValue, (val) => {
    localSearch.value = val; // Update the local state when the initial value changes
  });
  //#endregion

  //#region Methods
  /**
   * Updates the local search state and emits the updated value to the parent component.
   * @param val - The new value of the search input field.
   */
  function onSearchUpdate(val: string) {
    localSearch.value = val; // Update the local state
    emit('update:model-value', val); // Emit the updated value to the parent
  }
  //#endregion

  //#region Return
  // Return the reactive properties and methods for use in components
  return {
    localSearch,
    onSearchUpdate,
  };
  //#endregion
}