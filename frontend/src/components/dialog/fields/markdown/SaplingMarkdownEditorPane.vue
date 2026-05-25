<template>
  <section
    class="sapling-section-panel sapling-markdown-pane sapling-markdown-pane--editor glass-panel"
    :class="{ 'sapling-markdown-pane--disabled': disabled }"
  >
    <header class="sapling-section-header sapling-markdown-pane__header">
      <div class="sapling-markdown-pane__copy">
        <span class="sapling-eyebrow sapling-markdown-pane__eyebrow">{{ markdownLabel }}</span>
        <h3 class="sapling-section-title sapling-markdown-pane__title">{{ resolvedLabel }}</h3>
      </div>
    </header>

    <div class="sapling-markdown-input" :class="{ 'sapling-markdown-input--disabled': disabled }">
      <v-textarea
        :model-value="draftValue"
        :rules="rules"
        :disabled="disabled"
        :required="required"
        readonly
        hide-details="auto"
        tabindex="-1"
        class="sapling-markdown-validation-proxy"
      />

      <div
        class="sapling-markdown-editor-shell"
        :class="{ 'sapling-markdown-editor-shell--disabled': disabled }"
      >
        <div class="sapling-toolbar-group sapling-markdown-toolbar">
          <v-btn
            v-for="action in toolbarActions"
            :key="action.key"
            :icon="action.icon"
            :title="action.title"
            size="small"
            density="comfortable"
            variant="text"
            :disabled="disabled"
            @mousedown.prevent
            @click.stop="action.run"
          />
        </div>

        <SaplingCodeMirror
          v-if="isEnhancedEditorReady"
          ref="editor"
          :model-value="draftValue"
          language="markdown"
          :theme="editorTheme"
          :read-only="disabled"
          :line-numbers="false"
          class="sapling-markdown-editor"
          :style="{ height: editorHeight }"
          @focus="emit('focus')"
          @update:model-value="emit('update:draftValue', $event)"
        />
        <v-textarea
          v-else
          :model-value="draftValue"
          :disabled="disabled"
          :rows="Math.max(rows, 6)"
          hide-details
          no-resize
          class="sapling-markdown-editor sapling-markdown-editor--fallback"
          :style="{ height: editorHeight }"
          @focus="emit('focus')"
          @update:model-value="emit('update:draftValue', String($event ?? ''))"
        />
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SaplingCodeMirror from '@/components/common/SaplingCodeMirror.vue'
import type {
  MarkdownEditorHandle,
  MarkdownRule,
  MarkdownToolbarAction,
} from '@/components/dialog/fields/markdown/markdownField.types'

defineProps<{
  draftValue: string
  resolvedLabel: string
  rows: number
  disabled: boolean
  required: boolean
  rules: MarkdownRule[]
  toolbarActions: MarkdownToolbarAction[]
  isEnhancedEditorReady: boolean
  editorTheme: 'dark' | 'light'
  editorHeight: string
}>()

const emit = defineEmits<{
  focus: []
  'update:draftValue': [value: string]
}>()

const { t } = useI18n()
const editor = defineModel<MarkdownEditorHandle | null>('editor', { default: null })
const markdownLabel = computed(() => t('global.markdown'))
</script>
