<template>
  <v-date-input
    :label="label"
    :model-value="modelValue"
    :disabled="disabled"
    :rules="rules"
    @update:model-value="val => emit('update:modelValue', val)"
  />
</template>

<script lang="ts" setup>
defineProps<{
  label: string;
  modelValue: string | null;
  disabled?: boolean;
  rules?: Array<(value: string | null) => boolean | string>;
}>();

const emit = defineEmits(['update:modelValue']);
</script>
