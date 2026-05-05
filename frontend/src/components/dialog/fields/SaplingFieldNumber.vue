<template>
  <v-number-input
    :label="label"
    :model-value="modelValue"
    :disabled="disabled"
    :required="required"
    :placeholder="placeholder"
    :rules="rules"
    :min="min"
    :max="max"
    :step="step"
    :precision="precision"
    autocomplete="off"
    @update:model-value="(val) => emit('update:modelValue', val)"
  />
</template>

<script lang="ts" setup>
defineProps<{
  label: string
  modelValue: number | null
  disabled?: boolean
  required?: boolean
  placeholder?: string
  rules?: Array<(value: number | null) => boolean | string>
  min?: number
  max?: number
  step?: number
  precision?: number | null
}>()

const emit = defineEmits(['update:modelValue'])
</script>
