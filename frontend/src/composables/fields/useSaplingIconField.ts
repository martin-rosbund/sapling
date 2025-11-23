import { computed } from 'vue';

export function useSaplingIconField(props: any, emit: any) {
  const modelValueProxy = computed({
    get: () => props.modelValue,
    set: (val: string) => emit('update:modelValue', val)
  });

  const computedLabel = computed(() =>
    props.label + (props.required ? '*' : '')
  );

  const isDisabled = computed(() => !!props.disabled);

  function updateModelValue(val: string) {
    emit('update:modelValue', val);
  }

  return {
    computedLabel,
    isDisabled,
    modelValueProxy,
    updateModelValue
  };
}
