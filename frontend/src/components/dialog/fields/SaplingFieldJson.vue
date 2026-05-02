<template>
  <div>
    <div class="pt-1">
      <v-btn class="glass-panel" @click.stop="openDialog" block>
        <v-icon class="pr-3" left>mdi-code-json</v-icon>
        {{ label }}
      </v-btn>
    </div>

    <v-dialog
      v-model="dialog"
      min-width="90vw"
      min-height="90vh"
      max-width="90vw"
      max-height="90vh"
      persistent
    >
      <v-card class="glass-panel sapling-dialog-json-card sapling-dialog-card--fullscreen">
        <div class="sapling-dialog-shell sapling-fill-shell">
          <v-card-title class="sapling-dialog-json-title">{{ label }}</v-card-title>
          <v-card-text class="sapling-dialog-json-content">
            <div class="sapling-dialog-json-body">
              <SaplingCodeMirror
                v-model="jsonString"
                language="json"
                theme="dark"
                :read-only="disabled"
                class="sapling-dialog-json-editor"
              />
              <v-alert v-if="error" type="error" density="comfortable">{{ error }}</v-alert>
            </div>
          </v-card-text>
        </div>
        <SaplingActionSave :cancel="closeDialog" :save="saveJson" />
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import SaplingActionSave from '@/components/actions/SaplingActionSave.vue'
import SaplingCodeMirror from '@/components/common/SaplingCodeMirror.vue'

const props = defineProps<{
  modelValue: Record<string, unknown> | unknown[] | null
  label: string
  disabled?: boolean
}>()
const emit = defineEmits(['update:modelValue'])

const dialog = ref(false)
const error = ref('')

const jsonString = ref('')

watch(
  () => props.modelValue,
  (val) => {
    try {
      jsonString.value = val ? JSON.stringify(val, null, 2) : '{}'
      error.value = ''
    } catch {
      jsonString.value = '{}'
      error.value = 'Invalid JSON'
    }
  },
  { immediate: true },
)

function openDialog() {
  dialog.value = true
  try {
    jsonString.value = props.modelValue ? JSON.stringify(props.modelValue, null, 2) : '{}'
    error.value = ''
  } catch {
    jsonString.value = '{}'
    error.value = 'Invalid JSON'
  }
}
function closeDialog() {
  dialog.value = false
  error.value = ''
}
function saveJson() {
  try {
    const parsed = JSON.parse(jsonString.value)
    emit('update:modelValue', parsed)
    dialog.value = false
    error.value = ''
  } catch {
    error.value = 'JSON Parse Error'
  }
}
</script>
