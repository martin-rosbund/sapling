import { ref, watch } from 'vue';

export function useSaplingMarkdownField(props: {
  modelValue: string;
}) {
  const inputValue = ref(props.modelValue ?? '');

  // Panel-Index für Expansion Panel, leer = zugeklappt
  const panel = ref([]);

  watch(() => props.modelValue, (val) => {
    if (val !== inputValue.value) inputValue.value = val;
  });

  function emitInput(emit: (event: string, value: string) => void) {
    emit('update:modelValue', inputValue.value);
  }

  return {
    inputValue,
    panel,
    emitInput,
  };
}
