<template>
  <div class="sapling-markdown-content">
    <VueMarkdownRender
      :source="normalizedSource"
      :options="SAPLING_MARKDOWN_OPTIONS"
      :plugins="SAPLING_MARKDOWN_PLUGINS"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VueMarkdownRender from 'vue-markdown-render'
import {
  normalizeMarkdownContent,
  SAPLING_MARKDOWN_OPTIONS,
  SAPLING_MARKDOWN_PLUGINS,
} from '@/utils/markdown'

const props = withDefaults(
  defineProps<{
    source?: string | null
  }>(),
  {
    source: '',
  },
)

const normalizedSource = computed(() => normalizeMarkdownContent(props.source))
</script>
