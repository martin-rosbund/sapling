<template>
  <div class="sapling-file-preview sapling-file-json sapling-file-viewer sapling-file-preview-fullheight">
    <MonacoEditor
      v-model:value="jsonString"
      language="json"
      :theme="theme"
      :options="editorOptions"
      class="sapling-file-json-editor"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import MonacoEditor from 'monaco-editor-vue3';
import { i18n } from '@/i18n';

const props = defineProps<{ jsonUrl: string }>();
const theme = 'vs';
const editorOptions = {
  automaticLayout: true,
  minimap: { enabled: false },
  readOnly: true,
  scrollBeyondLastLine: false,
};
const jsonString = ref('');

async function fetchJson() {
  if (!props.jsonUrl) return;
  try {
    const response = await fetch(props.jsonUrl);
    const data = await response.json();
    jsonString.value = JSON.stringify(data, null, 2);
  } catch {
    jsonString.value = JSON.stringify({ error: i18n.global.t('document.noPreviewAvailable') }, null, 2);
  }
}

watch(() => props.jsonUrl, fetchJson, { immediate: true });
</script>

<style scoped src="@/assets/styles/SaplingFile.css"></style>
