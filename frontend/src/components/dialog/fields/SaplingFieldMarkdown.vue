<template>
  <v-card flat class="sapling-markdown-field">
    <div
      class="sapling-markdown-workspace"
      :class="{ 'sapling-markdown-workspace--single': !showPreview }"
    >
      <SaplingMarkdownEditorPane
        v-model:editor="editor"
        :draft-value="draftValue"
        :resolved-label="resolvedLabel"
        :rows="rows"
        :disabled="disabled"
        :required="required"
        :rules="rules"
        :toolbar-actions="toolbarActions"
        :is-enhanced-editor-ready="isEnhancedEditorReady"
        :editor-theme="editorTheme"
        :editor-height="editorHeight"
        @focus="emit('focus')"
        @update:draft-value="draftValue = $event"
      />

      <SaplingMarkdownPreviewPane
        :show-preview="showPreview"
        :disabled="disabled"
        :preview-value="previewValue"
        :is-enhanced-editor-ready="isEnhancedEditorReady"
        :refresh-preview-label="refreshPreviewLabel"
        @refresh="refreshPreview"
      />
    </div>
  </v-card>
</template>

<script setup lang="ts">
import '@/assets/styles/SaplingFieldMarkdown.css'
import SaplingMarkdownEditorPane from '@/components/dialog/fields/markdown/SaplingMarkdownEditorPane.vue'
import SaplingMarkdownPreviewPane from '@/components/dialog/fields/markdown/SaplingMarkdownPreviewPane.vue'
import { useSaplingMarkdownField } from '@/composables/fields/useSaplingMarkdownField'
import type { MarkdownRule } from '@/components/dialog/fields/markdown/markdownField.types'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    rows?: number
    showPreview?: boolean
    disabled?: boolean
    required?: boolean
    rules?: MarkdownRule[]
  }>(),
  {
    modelValue: '',
    label: '',
    rows: 6,
    showPreview: true,
    disabled: false,
    required: false,
    rules: () => [],
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'focus'): void
}>()

function emitMarkdownEvent(event: 'update:modelValue' | 'focus', value?: string) {
  if (event === 'focus') {
    emit('focus')
    return
  }

  emit('update:modelValue', value ?? '')
}

const {
  draftValue,
  previewValue,
  editor,
  isEnhancedEditorReady,
  resolvedLabel,
  editorTheme,
  editorHeight,
  refreshPreviewLabel,
  refreshPreview,
  toolbarActions,
  insertTextAtCursor,
} = useSaplingMarkdownField({
  modelValue: () => props.modelValue,
  rows: () => props.rows,
  label: () => props.label,
  emit: emitMarkdownEvent,
})

defineExpose({
  insertTextAtCursor,
})
</script>
