<template>
  <v-text-field
    :class="{ 'sapling-field-link--disabled': disabled }"
    :label="label"
    :model-value="modelValue"
    :rules="rules"
    :maxlength="maxlength"
    :readonly="disabled"
    :required="required"
    :placeholder="placeholder"
    append-inner-icon="mdi-link-variant"
    autocomplete="off"
    @click:append-inner="onLinkClick"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script lang="ts" setup>
const props = defineProps<{
  label: string
  modelValue: string
  rules?: ((value: string) => boolean | string)[]
  maxlength?: number
  disabled?: boolean
  required?: boolean
  placeholder: string
}>()

function onLinkClick() {
  if (props.modelValue) {
    let url = props.modelValue
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`
    }
    window.open(url, '_blank')
  }
}
</script>

<style scoped>
.sapling-field-link--disabled :deep(.v-field) {
  opacity: var(--v-disabled-opacity);
}
</style>
