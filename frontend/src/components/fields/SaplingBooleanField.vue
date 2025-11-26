<template>
  <v-checkbox
    :label="label"
    :model-value="modelValue"
    :disabled="disabled"
    @update:model-value="val => emit('update:modelValue', val)"
  />
</template>

<script lang="ts" setup>
  import { defineProps, defineEmits } from 'vue';

  defineProps<{
    label: string;
    modelValue: boolean;
    disabled?: boolean;
  }>();

  const emit = defineEmits(['update:modelValue']);
</script>
