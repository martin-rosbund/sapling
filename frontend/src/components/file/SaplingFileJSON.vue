<template>
  <div
    class="sapling-file-preview sapling-file-json sapling-file-viewer sapling-file-preview-fullheight"
  >
    <SaplingCodeMirror
      v-model="jsonString"
      language="json"
      theme="light"
      read-only
      class="sapling-file-json-editor"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import SaplingCodeMirror from '@/components/common/SaplingCodeMirror.vue'
import { i18n } from '@/i18n'

const props = defineProps<{ jsonUrl: string }>()
const jsonString = ref('')

async function fetchJson() {
  if (!props.jsonUrl) return
  try {
    const response = await fetch(props.jsonUrl, {
      credentials: 'include',
    })
    const data = await response.json()
    jsonString.value = JSON.stringify(data, null, 2)
  } catch {
    jsonString.value = JSON.stringify(
      { error: i18n.global.t('document.noPreviewAvailable') },
      null,
      2,
    )
  }
}

watch(() => props.jsonUrl, fetchJson, { immediate: true })
</script>
