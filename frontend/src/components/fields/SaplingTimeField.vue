<template>
  <v-text-field
    :label="label"
    :model-value="modelValue"
    type="time"
    :disabled="disabled"
    :rules="rules"
    @update:model-value="val => emit('update:modelValue', val)"
  />
</template>

<script lang="ts" setup>
import { defineProps, defineEmits } from 'vue';
const props = defineProps<{
  label: string;
  modelValue: string | null;
  disabled?: boolean;
  rules?: any[];
}>();
const emit = defineEmits(['update:modelValue']);
</script>
