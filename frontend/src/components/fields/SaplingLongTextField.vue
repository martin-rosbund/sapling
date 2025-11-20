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
import { defineProps, defineEmits } from 'vue';
const props = defineProps<{
  label: string;
  modelValue: string | null;
  maxlength?: number;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  rules?: any[];
}>();
const emit = defineEmits(['update:modelValue']);
</script>
