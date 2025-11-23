import { computed } from 'vue';

export function useSaplingDateTimeField(props: any, emit: any) {
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
    updateTime
  };
}
