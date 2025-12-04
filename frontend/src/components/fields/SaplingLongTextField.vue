<template>
  <v-textarea
    :label="label"
    :model-value="modelValue"
    :maxlength="maxlength"
    :disabled="disabled"
    :required="required"
    :placeholder="placeholder"
    :rules="rules"
    auto-grow
    @update:model-value="val => emit('update:modelValue', val)"
  />
</template>

<script lang="ts" setup>

  defineProps<{
    label: string;
    modelValue: string | null;
    maxlength?: number;
    disabled?: boolean;
    required?: boolean;
    placeholder?: string;
    rules?: Array<(value: string | null) => boolean | string>;
  }>();

  const emit = defineEmits(['update:modelValue']);
</script>
