<template>
  <v-text-field
    :label="label"
    :model-value="modelValue"
    :rules="rules"
    :maxlength="maxlength"
    :disabled="disabled"
    :required="required"
    :placeholder="placeholder"
    append-inner-icon="mdi-phone"
    @click:append-inner="onPhoneClick"
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

function onPhoneClick() {
  if (props.modelValue) {
    window.open(`tel:${props.modelValue}`, '_self');
  }
}
</script>
