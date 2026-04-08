import { computed } from 'vue';

type SaplingDateTimeFieldProps = {
  label: string;
  disabled?: boolean;
  required?: boolean;
};

type SaplingDateTimeFieldEmit = {
  (event: 'update:dateValue', value: string): void;
  (event: 'update:timeValue', value: string): void;
};

export function useSaplingDateTimeField(props: SaplingDateTimeFieldProps, emit: SaplingDateTimeFieldEmit) {
  const computedLabel = computed(() =>
    props.label + (props.required ? '*' : '')
  );

  const isDisabled = computed(() => !!props.disabled);

  function updateDate(val: string) {
    emit('update:dateValue', val);
  }

  function updateTime(val: string) {
    emit('update:timeValue', val);
  }

  return {
    computedLabel,
    isDisabled,
    updateDate,
    updateTime,
  };
}
