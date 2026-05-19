<template>
  <section
    v-if="showPreview"
    class="sapling-markdown-pane sapling-markdown-pane--preview glass-panel"
  >
    <header class="sapling-markdown-pane__header">
      <div class="sapling-markdown-pane__copy">
        <span class="sapling-markdown-pane__eyebrow">{{ liveLabel }}</span>
        <h3 class="sapling-markdown-pane__title">{{ previewTitle }}</h3>
      </div>
      <v-btn
        color="primary"
        variant="tonal"
        size="small"
        prepend-icon="mdi-refresh"
        :disabled="disabled"
        @click="emit('refresh')"
      >
        {{ refreshPreviewLabel }}
      </v-btn>
    </header>

    <div class="sapling-markdown-preview">
      <SaplingMarkdownContent v-if="isEnhancedEditorReady" :source="previewValue" />
      <pre v-else class="sapling-markdown-preview__plain">{{ previewValue }}</pre>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SaplingMarkdownContent from '@/components/common/SaplingMarkdownContent.vue'

defineProps<{
  showPreview: boolean
  disabled: boolean
  previewValue: string
  isEnhancedEditorReady: boolean
  refreshPreviewLabel: string
}>()

const emit = defineEmits<{
  refresh: []
}>()

const { t } = useI18n()
const liveLabel = computed(() => t('global.live'))
const previewTitle = computed(() => t('document.preview'))
</script>
