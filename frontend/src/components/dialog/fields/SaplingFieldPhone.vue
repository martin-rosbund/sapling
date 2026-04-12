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
    autocomplete="off"
    @click:append-inner="onPhoneClick"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script lang="ts" setup>
import { useSaplingPhoneDialog } from '@/composables/dialog/useSaplingPhoneDialog';

const props = defineProps<{
  label: string;
  modelValue: string;
  rules?: ((value: string) => boolean | string)[];
  maxlength?: number;
  disabled?: boolean;
  required?: boolean;
  placeholder: string;
  entityHandle?: string;
  itemHandle?: string | number;
  draftValues?: Record<string, unknown>;
}>();

const { openPhoneDialog } = useSaplingPhoneDialog();

function onPhoneClick() {
  if (props.modelValue) {
    openPhoneDialog({
      entityHandle: props.entityHandle,
      itemHandle: props.itemHandle,
      draftValues: props.draftValues,
      phoneNumber: props.modelValue,
    });
  }
}
</script>
