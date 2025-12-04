<template>
  <v-text-field
    :label="label"
    :model-value="modelValue"
    :rules="rules"
    :maxlength="maxlength"
    :disabled="disabled"
    :required="required"
    :placeholder="placeholder"
    append-inner-icon="mdi-link-variant"
    @click:append-inner="onLinkClick"
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

function onLinkClick() {
  if (props.modelValue) {
    let url = props.modelValue;
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    window.open(url, '_blank');
  }
}
</script>
