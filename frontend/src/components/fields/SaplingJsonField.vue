<template>
  <div>
    <div class="pt-1">
    <v-btn class="glass-panel" @click.stop="openDialog" block>
      <v-icon class="pr-3" left>mdi-code-json</v-icon>
      {{ label }}
    </v-btn>
    </div>

    <v-dialog v-model="dialog" min-width="90vw" min-height="90vh" max-width="90vw" max-height="90vh" persistent>
      <v-card class="glass-panel pa-6" style="height: 100%; min-height: 90vh; display: flex; flex-direction: column;">
        <v-card-title>{{ label }}</v-card-title>
        <v-card-text>
          <MonacoEditor
            v-model:value="jsonString"
            language="json"
            :theme="theme"
            :options="{ ...editorOptions, readOnly: disabled }"
            style="height: 70vh; width: 100%;"
          />
          <v-alert v-if="error" type="error" dense>{{ error }}</v-alert>
        </v-card-text>
        <SaplingSaveAction :cancel="closeDialog" :save="saveJson" />
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import MonacoEditor from 'monaco-editor-vue3';
import SaplingSaveAction from '../actions/SaplingSaveAction.vue';

const props = defineProps<{
  modelValue: Record<string, unknown> | unknown[] | null;
  label: string;
  disabled?: boolean;
}>();
const emit = defineEmits(['update:modelValue']);

const dialog = ref(false);
const error = ref('');
const theme = 'vs-dark';
const editorOptions = { minimap: { enabled: false } };

const jsonString = ref('');

watch(() => props.modelValue, (val) => {
  try {
    jsonString.value = val ? JSON.stringify(val, null, 2) : '{}';
    error.value = '';
  } catch {
    jsonString.value = '{}';
    error.value = 'Invalid JSON';
  }
}, { immediate: true });

function openDialog() {
  dialog.value = true;
  try {
    jsonString.value = props.modelValue ? JSON.stringify(props.modelValue, null, 2) : '{}';
    error.value = '';
  } catch {
    jsonString.value = '{}';
    error.value = 'Invalid JSON';
  }
}
function closeDialog() {
  dialog.value = false;
  error.value = '';
}
function saveJson() {
  try {
    const parsed = JSON.parse(jsonString.value);
    emit('update:modelValue', parsed);
    dialog.value = false;
    error.value = '';
  } catch {
    error.value = 'JSON Parse Error';
  }
}
</script>
