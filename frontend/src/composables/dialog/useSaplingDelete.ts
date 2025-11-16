import { ref } from 'vue';
import type { FormType } from '@/entity/structure';

export function useSaplingDelete(initialVisible = false, initialItem: FormType | null = null) {
  const modelValue = ref<boolean>(initialVisible);
  const item = ref<FormType | null>(initialItem);

  function onDialogUpdate(val: boolean, emit: (event: 'update:modelValue', value: boolean) => void) {
    emit('update:modelValue', val);
  }

  function cancel(emit: (event: 'update:modelValue', value: boolean) => void, emitCancel: () => void) {
    emit('update:modelValue', false);
    emitCancel();
  }

  function confirm(emit: (event: 'update:modelValue', value: boolean) => void, emitConfirm: () => void) {
    emit('update:modelValue', false);
    emitConfirm();
  }

  return {
    modelValue,
    item,
    onDialogUpdate,
    cancel,
    confirm,
  };
}
