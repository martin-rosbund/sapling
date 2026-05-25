<template>
  <v-text-field
    type="color"
    :label="computedLabel"
    v-model="modelValueProxy"
    :disabled="isDisabled"
    :rules="rules"
    hide-details="auto"
    class="sapling-field-color"
    autocomplete="off"
  />
</template>

<script setup lang="ts">
import { useSaplingColorField } from '@/composables/fields/useSaplingColorField'

const props = defineProps<{
  label: string
  modelValue: string
  disabled?: boolean
  rules?: Array<(value: string) => boolean | string>
  required?: boolean
}>()

const emit = defineEmits(['update:modelValue'])

const { computedLabel, isDisabled, modelValueProxy } = useSaplingColorField(props, emit)
</script>
