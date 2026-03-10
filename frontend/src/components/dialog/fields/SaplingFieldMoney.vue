<template>
  <v-number-input
    :label="label"
    :model-value="modelValue"
    :disabled="disabled"
    :required="required"
    :placeholder="placeholder"
    :rules="rules"
    :min="0"
    :max="1000000"
    :step="10000"
    :prefix="currencySymbol"
    autocomplete="off"
    @update:model-value="val => emit('update:modelValue', val)"
  />
</template>

<script lang="ts" setup>
  import { ref, computed } from 'vue';
  import CookieService from '@/services/cookie.service';

  defineProps<{
    label: string;
    modelValue: number | null;
    disabled?: boolean;
    required?: boolean;
    placeholder?: string;
    rules?: Array<(value: number | null) => boolean | string>;
  }>();

  const emit = defineEmits(['update:modelValue']);

  const currentLanguage = ref(CookieService.get('language') || 'de');
  const currencySymbol = computed(() => {
    return currentLanguage.value === 'de' ? '€' : '$';
  });
</script>
