import { ref, watch, type Ref } from 'vue'

/**
 * Composable for managing the search input logic.
 * @param modelValue - The reactive model value passed by the parent component.
 * @param emit - The emit function to communicate with the parent component.
 */
export function useSaplingSearch(
  modelValue: Ref<string>,
  emit: (event: 'update:model-value', value: string) => void,
) {
  //#region State
  const localSearch = ref(modelValue.value)
  //#endregion

  //#region Lifecycle
  watch(modelValue, (value) => {
    localSearch.value = value
  })
  //#endregion

  //#region Methods
  /**
   * Updates the local search state and emits the updated value to the parent component.
   * @param val - The new value of the search input field.
   */
  function onSearchUpdate(val: string) {
    localSearch.value = val
    emit('update:model-value', val)
  }
  //#endregion

  //#region Return
  // Return the reactive properties and methods for use in components
  return {
    localSearch,
    onSearchUpdate,
  }
  //#endregion
}
