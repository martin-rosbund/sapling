<template>
  <div class="sapling-file-preview sapling-file-json sapling-file-preview-fullheight">
    <MonacoEditor
      v-model:value="jsonString"
      language="json"
      :theme="theme"
      :options="editorOptions"
      style="height: 100%; width: 100%; min-height: 0; display: block;"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import MonacoEditor from 'monaco-editor-vue3';

const props = defineProps<{ jsonUrl: string }>();
const theme = 'vs-dark';
const editorOptions = { minimap: { enabled: false }, readOnly: true };
const jsonString = ref('');

async function fetchJson() {
  if (!props.jsonUrl) return;
  try {
    const response = await fetch(props.jsonUrl);
    const data = await response.json();
    jsonString.value = JSON.stringify(data, null, 2);
  } catch {
    jsonString.value = '{\n  "error": "JSON konnte nicht geladen werden"\n}';
  }
}

watch(() => props.jsonUrl, fetchJson, { immediate: true });
</script>

<style scoped src="@/assets/styles/SaplingFileJSONScoped.css"></style>
