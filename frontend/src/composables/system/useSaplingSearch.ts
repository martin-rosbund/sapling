import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

const SEARCH_INPUT_DEBOUNCE_MS = 250

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
  let searchEmitTimeout: ReturnType<typeof setTimeout> | null = null
  //#endregion

  //#region Lifecycle
  watch(modelValue, (value) => {
    if (searchEmitTimeout) {
      clearTimeout(searchEmitTimeout)
      searchEmitTimeout = null
    }

    localSearch.value = value
  })

  onBeforeUnmount(() => {
    if (searchEmitTimeout) {
      clearTimeout(searchEmitTimeout)
      searchEmitTimeout = null
    }
  })
  //#endregion

  //#region Methods
  /**
   * Updates the local search state and emits the updated value to the parent component.
   * @param val - The new value of the search input field.
   */
  function onSearchUpdate(val: string | null) {
    const nextValue = val ?? ''
    localSearch.value = nextValue

    if (searchEmitTimeout) {
      clearTimeout(searchEmitTimeout)
    }

    searchEmitTimeout = setTimeout(() => {
      searchEmitTimeout = null
      emit('update:model-value', nextValue)
    }, SEARCH_INPUT_DEBOUNCE_MS)
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
