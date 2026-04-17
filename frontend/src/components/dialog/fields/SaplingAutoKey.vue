<template>
  <v-text-field
    :label="label"
    :model-value="modelValue"
    :maxlength="maxlength"
    :disabled="disabled"
    :required="required"
    :placeholder="placeholder"
    :rules="rules"
    :type="isVisible ? 'text' : 'password'"
    autocomplete="off"
    @update:model-value="(val) => emit('update:modelValue', val)"
  >
    <template #append-inner>
      <div class="sapling-auto-key__actions">
        <v-btn
          :icon="isVisible ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
          size="small"
          variant="text"
          :disabled="disabled"
          @click="toggleVisibility"
        />
        <v-btn
          icon="mdi-key-plus"
          size="small"
          variant="text"
          :disabled="disabled"
          @click="generateKey"
        />
      </div>
    </template>
  </v-text-field>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

const props = defineProps<{
  label: string
  modelValue: string | null
  maxlength?: number
  disabled?: boolean
  required?: boolean
  placeholder?: string
  rules?: Array<(value: string | null) => boolean | string>
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

const isVisible = ref(false)

function toggleVisibility(): void {
  isVisible.value = !isVisible.value
}

function generateKey(): void {
  if (props.disabled) {
    return
  }

  const bytes = new Uint8Array(32)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }

  const token = `sap_${Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')}`
  emit('update:modelValue', token)
  isVisible.value = true
}
</script>

<style scoped>
.sapling-auto-key__actions {
  display: flex;
  align-items: center;
  gap: 2px;
}
</style>