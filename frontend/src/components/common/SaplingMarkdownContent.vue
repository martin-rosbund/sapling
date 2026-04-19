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

<style scoped>
.sapling-markdown-content {
  min-width: 0;
}

.sapling-markdown-content :deep(*) {
  overflow-wrap: anywhere;
}

.sapling-markdown-content :deep(h1),
.sapling-markdown-content :deep(h2),
.sapling-markdown-content :deep(h3),
.sapling-markdown-content :deep(h4),
.sapling-markdown-content :deep(h5),
.sapling-markdown-content :deep(h6),
.sapling-markdown-content :deep(p),
.sapling-markdown-content :deep(ul),
.sapling-markdown-content :deep(ol),
.sapling-markdown-content :deep(blockquote),
.sapling-markdown-content :deep(pre),
.sapling-markdown-content :deep(table) {
  margin: 0 0 0.9rem;
}

.sapling-markdown-content :deep(h1:first-child),
.sapling-markdown-content :deep(h2:first-child),
.sapling-markdown-content :deep(h3:first-child),
.sapling-markdown-content :deep(h4:first-child),
.sapling-markdown-content :deep(h5:first-child),
.sapling-markdown-content :deep(h6:first-child),
.sapling-markdown-content :deep(p:first-child),
.sapling-markdown-content :deep(ul:first-child),
.sapling-markdown-content :deep(ol:first-child),
.sapling-markdown-content :deep(blockquote:first-child),
.sapling-markdown-content :deep(pre:first-child),
.sapling-markdown-content :deep(table:first-child) {
  margin-top: 0;
}

.sapling-markdown-content :deep(h1:last-child),
.sapling-markdown-content :deep(h2:last-child),
.sapling-markdown-content :deep(h3:last-child),
.sapling-markdown-content :deep(h4:last-child),
.sapling-markdown-content :deep(h5:last-child),
.sapling-markdown-content :deep(h6:last-child),
.sapling-markdown-content :deep(p:last-child),
.sapling-markdown-content :deep(ul:last-child),
.sapling-markdown-content :deep(ol:last-child),
.sapling-markdown-content :deep(blockquote:last-child),
.sapling-markdown-content :deep(pre:last-child),
.sapling-markdown-content :deep(table:last-child) {
  margin-bottom: 0;
}

.sapling-markdown-content :deep(ul),
.sapling-markdown-content :deep(ol) {
  padding-left: 1.3rem;
}

.sapling-markdown-content :deep(li + li) {
  margin-top: 0.25rem;
}

.sapling-markdown-content :deep(blockquote) {
  padding-left: 0.9rem;
  border-left: 3px solid rgba(var(--v-theme-primary), 0.55);
  opacity: 0.92;
}

.sapling-markdown-content :deep(pre) {
  overflow-x: auto;
  padding: 0.8rem 0.95rem;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.18);
}

.sapling-markdown-content :deep(code) {
  font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace;
  font-size: 0.95em;
}

.sapling-markdown-content :deep(:not(pre) > code) {
  padding: 0.15rem 0.35rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
}

.sapling-markdown-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  display: block;
  overflow-x: auto;
}

.sapling-markdown-content :deep(th),
.sapling-markdown-content :deep(td) {
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--sapling-surface-border);
  text-align: left;
}

.sapling-markdown-content :deep(th) {
  background: rgba(255, 255, 255, 0.06);
}

.sapling-markdown-content :deep(a) {
  color: rgb(var(--v-theme-primary));
}

.sapling-markdown-content :deep(input[type='checkbox']) {
  margin-right: 0.45rem;
}
</style>