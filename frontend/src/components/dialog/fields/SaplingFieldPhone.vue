<template>
  <v-text-field
    :class="{ 'sapling-field-phone--disabled': disabled }"
    :label="label"
    :model-value="formattedModelValue"
    :rules="rules"
    :maxlength="maxlength"
    :readonly="disabled"
    :required="required"
    :placeholder="placeholder"
    append-inner-icon="mdi-phone"
    autocomplete="off"
    @click:append-inner="onPhoneClick"
    @update:model-value="updateModelValue"
  />
</template>

<script lang="ts" setup>
import { computed, toRef, watch } from 'vue';
import { useSaplingPhoneDialog } from '@/composables/dialog/useSaplingPhoneDialog';
import { useSaplingPhoneNumber } from '@/composables/phone/useSaplingPhoneNumber';

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

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
}>();

const { openPhoneDialog } = useSaplingPhoneDialog();
const { currentCountryHandle, currentDialingCode, formatPhoneNumber } = useSaplingPhoneNumber();
const modelValue = toRef(props, 'modelValue');
const formattedModelValue = computed(() => formatPhoneNumber(props.modelValue));

watch([modelValue, currentCountryHandle, currentDialingCode], ([value]) => {
  const formattedValue = formatPhoneNumber(value);
  if (formattedValue !== value) {
    emit('update:modelValue', formattedValue);
  }
});

function updateModelValue(value: string) {
  emit('update:modelValue', formatPhoneNumber(value));
}

function onPhoneClick() {
  const formattedValue = formatPhoneNumber(props.modelValue);
  if (formattedValue) {
    openPhoneDialog({
      entityHandle: props.entityHandle,
      itemHandle: props.itemHandle,
      draftValues: props.draftValues,
      phoneNumber: formattedValue,
    });
  }
}
</script>

<style scoped>
.sapling-field-phone--disabled :deep(.v-field) {
  opacity: var(--v-disabled-opacity);
}
</style>
