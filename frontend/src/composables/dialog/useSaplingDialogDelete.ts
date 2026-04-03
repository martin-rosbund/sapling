// #region Types
type SaplingDialogDeleteEmit = {
  (event: 'update:modelValue', value: boolean): void;
  (event: 'confirm'): void;
  (event: 'cancel'): void;
};
// #endregion

/**
 * Provides the stateless interaction handlers for the shared delete dialog.
 */
export function useSaplingDialogDelete(emit: SaplingDialogDeleteEmit) {
  // #region Methods
  /**
   * Synchronizes the dialog visibility with the parent state.
   */
  function handleDialogUpdate(value: boolean): void {
    emit('update:modelValue', value);
  }

  /**
   * Closes the dialog and forwards the cancel event.
   */
  function handleCancel(): void {
    emit('update:modelValue', false);
    emit('cancel');
  }

  /**
   * Closes the dialog and forwards the confirm event.
   */
  function handleConfirm(): void {
    emit('update:modelValue', false);
    emit('confirm');
  }
  // #endregion

  // #region Return
  return {
    handleDialogUpdate,
    handleCancel,
    handleConfirm,
  };
  // #endregion
}
