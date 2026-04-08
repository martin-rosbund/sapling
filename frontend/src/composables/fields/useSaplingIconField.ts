import { computed } from 'vue';

type SaplingIconFieldProps = {
  label: string;
  modelValue: string;
  disabled?: boolean;
  required?: boolean;
};

type SaplingIconFieldEmit = (event: 'update:modelValue', value: string) => void;

export function useSaplingIconField(props: SaplingIconFieldProps, emit: SaplingIconFieldEmit) {
  const modelValueProxy = computed({
    get: () => props.modelValue,
    set: (val: string) => emit('update:modelValue', val),
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
    updateModelValue,
  };
}
