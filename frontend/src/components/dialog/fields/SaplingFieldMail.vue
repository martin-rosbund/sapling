<template>
  <v-text-field
    :class="{ 'sapling-field-mail--disabled': disabled }"
    :label="label"
    :model-value="modelValue"
    :rules="rules"
    :maxlength="maxlength"
    :readonly="disabled"
    :required="required"
    :placeholder="placeholder"
    append-inner-icon="mdi-email"
    @click:append-inner="onMailClick"
    autocomplete="off"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script lang="ts" setup>
import { useSaplingMailDialog } from '@/composables/dialog/useSaplingMailDialog'

const props = defineProps<{
  label: string
  modelValue: string
  rules?: ((value: string) => boolean | string)[]
  maxlength?: number
  disabled?: boolean
  required?: boolean
  placeholder: string
  entityHandle?: string
  itemHandle?: string | number
  draftValues?: Record<string, unknown>
}>()

const { openMailDialog } = useSaplingMailDialog()

function onMailClick() {
  if (!props.entityHandle) {
    return
  }

  openMailDialog({
    entityHandle: props.entityHandle,
    itemHandle: props.itemHandle,
    draftValues: props.draftValues,
    initialTo: props.modelValue ? [props.modelValue] : [],
  })
}
</script>
