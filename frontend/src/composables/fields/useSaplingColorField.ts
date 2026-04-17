import { computed } from 'vue'

type SaplingColorFieldProps = {
  label: string
  modelValue: string
  disabled?: boolean
  required?: boolean
}

type SaplingColorFieldEmit = (event: 'update:modelValue', value: string) => void

export function useSaplingColorField(props: SaplingColorFieldProps, emit: SaplingColorFieldEmit) {
  const modelValueProxy = computed({
    get: () => props.modelValue,
    set: (val: string) => emit('update:modelValue', val),
  })

  const computedLabel = computed(() => props.label + (props.required ? '*' : ''))

  const isDisabled = computed(() => !!props.disabled)

  return {
    computedLabel,
    isDisabled,
    modelValueProxy,
  }
}
