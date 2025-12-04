<template>
  <v-text-field
    :label="label"
    :model-value="modelValue"
    type="number"
    :disabled="disabled"
    :required="required"
    :placeholder="placeholder"
    :rules="rules"
    @update:model-value="val => emit('update:modelValue', val)"
  />
</template>

<script lang="ts" setup>
  defineProps<{
    label: string;
    modelValue: number | null;
    disabled?: boolean;
    required?: boolean;
    placeholder?: string;
    rules?: Array<(value: number | null) => boolean | string>;
  }>();

  const emit = defineEmits(['update:modelValue']);
</script>
