// #region Types
type SaplingDialogUnsavedChangesEmit = {
  (event: 'update:modelValue', value: boolean): void
  (event: 'keepEditing'): void
  (event: 'discard'): void
  (event: 'saveAndClose'): void
}
// #endregion

/**
 * Stateless interaction handlers for the shared "unsaved changes" confirmation dialog.
 * Mirrors the contract of useSaplingDialogDelete so consumers can wire up
 * the dialog declaratively.
 */
export function useSaplingDialogUnsavedChanges(emit: SaplingDialogUnsavedChangesEmit) {
  // #region Methods
  function handleDialogUpdate(value: boolean): void {
    if (!value) {
      // Treat outside dismiss as "keep editing" to avoid losing data silently.
      emit('keepEditing')
      return
    }
    emit('update:modelValue', value)
  }

  function handleKeepEditing(): void {
    emit('update:modelValue', false)
    emit('keepEditing')
  }

  function handleDiscard(): void {
    emit('update:modelValue', false)
    emit('discard')
  }

  function handleSaveAndClose(): void {
    emit('saveAndClose')
  }
  // #endregion

  return {
    handleDialogUpdate,
    handleKeepEditing,
    handleDiscard,
    handleSaveAndClose,
  }
}
