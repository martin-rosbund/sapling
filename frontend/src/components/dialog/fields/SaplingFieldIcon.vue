<template>
  <v-select
    :items="items"
    :model-value="modelValueProxy"
    item-title="name"
    item-value="name"
    :label="computedLabel"
    :disabled="isDisabled"
    :rules="rules"
    hide-details="auto"
    @update:model-value="updateModelValue"
  />
</template>

<script setup lang="ts">
  import { useSaplingIconField } from '@/composables/fields/useSaplingIconField';

  const props = defineProps<{
    items: { name: string }[];
    modelValue: string;
    label: string;
    disabled?: boolean;
    rules?: Array<(value: string) => boolean | string>;
    required?: boolean;
  }>();
  const emit = defineEmits(['update:modelValue']);

  const { computedLabel, isDisabled, modelValueProxy, updateModelValue } = useSaplingIconField(props, emit);
</script>
