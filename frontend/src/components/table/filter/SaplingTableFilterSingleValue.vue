<template>
  <v-text-field
    :model-value="modelValue"
    :type="inputType"
    :label="label"
    :prefix="prefix"
    :suffix="suffix"
    :step="step"
    :clearable="clearable"
    density="comfortable"
    variant="outlined"
    hide-details
    class="sapling-table-filter-menu__field"
    @update:model-value="(value) => emit('update:modelValue', normalizeValue(value))"
  />
</template>

<script lang="ts" setup>
defineProps<{
  modelValue: string
  inputType: string
  label: string
  prefix?: string
  suffix?: string
  step?: string
  clearable: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function normalizeValue(value: string | number | null | undefined) {
  if (value === null || typeof value === 'undefined') {
    return ''
  }

  return String(value)
}
</script>
