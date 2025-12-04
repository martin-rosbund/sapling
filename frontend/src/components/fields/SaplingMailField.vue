<template>
  <v-text-field
    :label="label"
    :model-value="modelValue"
    :rules="rules"
    :maxlength="maxlength"
    :disabled="disabled"
    :required="required"
    :placeholder="placeholder"
    append-inner-icon="mdi-email"
    @click:append-inner="onMailClick"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script lang="ts" setup>

const props = defineProps<{
  label: string;
  modelValue: string;
  rules?: ((value: string) => boolean | string)[];
  maxlength?: number;
  disabled?: boolean;
  required?: boolean;
  placeholder: string;
}>();

const emit = defineEmits(['update:modelValue']);

function onMailClick() {
  if (props.modelValue) {
    window.open(`mailto:${props.modelValue}`, '_self');
  }
}
</script>
