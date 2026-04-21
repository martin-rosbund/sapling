<template>
  <v-card flat class="sapling-markdown-field">
    <div
      class="sapling-markdown-workspace"
      :class="{ 'sapling-markdown-workspace--single': !showPreview }"
    >
      <section
        class="sapling-markdown-pane sapling-markdown-pane--editor glass-panel"
        :class="{ 'sapling-markdown-pane--disabled': disabled }"
      >
        <header class="sapling-markdown-pane__header">
          <div class="sapling-markdown-pane__copy">
            <span class="sapling-markdown-pane__eyebrow">Markdown</span>
            <h3 class="sapling-markdown-pane__title">{{ label }}</h3>
          </div>
        </header>

        <div
          class="sapling-markdown-input"
          :class="{ 'sapling-markdown-input--disabled': disabled }"
        >
          <v-textarea
            :model-value="inputValue"
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
            <div class="sapling-markdown-toolbar">
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

            <MonacoEditor
              v-model:value="inputValue"
              language="markdown"
              :theme="editorTheme"
              :options="editorOptions"
              class="sapling-markdown-editor"
              :style="{ height: editorHeight }"
              @editorDidMount="handleEditorDidMount"
            />
          </div>
        </div>
      </section>

      <section
        v-if="showPreview"
        class="sapling-markdown-pane sapling-markdown-pane--preview glass-panel"
      >
        <header class="sapling-markdown-pane__header">
          <div class="sapling-markdown-pane__copy">
            <span class="sapling-markdown-pane__eyebrow">Live</span>
            <h3 class="sapling-markdown-pane__title">Preview</h3>
          </div>
        </header>

        <div class="sapling-markdown-preview">
          <SaplingMarkdownContent :source="inputValue" />
        </div>
      </section>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed, markRaw, shallowRef } from 'vue'
import MonacoEditor from 'monaco-editor-vue3'
import SaplingMarkdownContent from '@/components/common/SaplingMarkdownContent.vue'
import CookieService from '@/services/cookie.service'

interface MarkdownRule {
  (value: string | null): boolean | string
}

interface MarkdownEditorPosition {
  lineNumber: number
  column: number
}

interface MarkdownEditorRange {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
}

interface MarkdownEditorSelection extends MarkdownEditorRange {
  isEmpty(): boolean
}

interface MarkdownEditorModel {
  getValue(): string
  getValueInRange(range: MarkdownEditorRange): string
  getOffsetAt(position: MarkdownEditorPosition): number
  getPositionAt(offset: number): MarkdownEditorPosition
}

interface MarkdownEditorInstance {
  getModel(): MarkdownEditorModel | null
  getSelection(): MarkdownEditorSelection | null
  executeEdits(
    source: string,
    edits: Array<{ range: MarkdownEditorRange; text: string; forceMoveMarkers?: boolean }>,
  ): void
  setSelection(range: MarkdownEditorRange): void
  focus(): void
}

interface MarkdownTransformResult {
  text: string
  selectionStart?: number
  selectionEnd?: number
}

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
    label: 'Markdown',
    rows: 6,
    showPreview: true,
    disabled: false,
    required: false,
    rules: () => [],
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

const inputValue = computed({
  get: () => props.modelValue ?? '',
  set: (value: string) => emit('update:modelValue', value),
})
const editor = shallowRef<MarkdownEditorInstance | null>(null)

const editorTheme = computed(() => (CookieService.get('theme') === 'dark' ? 'vs-dark' : 'vs'))
const editorHeight = computed(() => `${Math.max(props.rows, 6) * 24 + 56}px`)
const editorOptions = computed(() => ({
  automaticLayout: true,
  minimap: { enabled: false },
  readOnly: props.disabled,
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  lineNumbers: 'off',
  glyphMargin: false,
  folding: false,
  lineDecorationsWidth: 12,
  lineNumbersMinChars: 0,
  overviewRulerLanes: 0,
  renderLineHighlight: 'none',
  padding: { top: 12, bottom: 12 },
}))

function handleEditorDidMount(instance: MarkdownEditorInstance) {
  editor.value = markRaw(instance)
}

function wrapSelection(prefix: string, suffix = prefix, placeholder = 'Text') {
  applySelection((selectedText) => {
    const content = selectedText || placeholder

    return {
      text: `${prefix}${content}${suffix}`,
      selectionStart: prefix.length,
      selectionEnd: prefix.length + content.length,
    }
  })
}

function applyOrderedList() {
  applySelection((selectedText) => {
    const content = selectedText || 'List item'
    const lines = content.split('\n')
    const shouldUnwrap = lines.every((line, index) => line.startsWith(`${index + 1}. `))
    const transformed = lines
      .map((line, index) => {
        const prefix = `${index + 1}. `

        if (!line.trim()) {
          return shouldUnwrap ? line : prefix
        }

        return shouldUnwrap && line.startsWith(prefix)
          ? line.slice(prefix.length)
          : `${prefix}${line}`
      })
      .join('\n')

    return {
      text: transformed,
      selectionStart: 0,
      selectionEnd: transformed.length,
    }
  })
}

function applyChecklist() {
  applySelection((selectedText) => {
    const content = selectedText || 'Task'
    const lines = content.split('\n')
    const uncheckedPrefix = '- [ ] '
    const checkedPrefix = '- [x] '
    const shouldUnwrap = lines.every(
      (line) => line.startsWith(uncheckedPrefix) || line.startsWith(checkedPrefix),
    )
    const transformed = lines
      .map((line) => {
        if (!line.trim()) {
          return shouldUnwrap ? line : uncheckedPrefix
        }

        if (shouldUnwrap) {
          if (line.startsWith(uncheckedPrefix)) {
            return line.slice(uncheckedPrefix.length)
          }

          if (line.startsWith(checkedPrefix)) {
            return line.slice(checkedPrefix.length)
          }
        }

        return `${uncheckedPrefix}${line}`
      })
      .join('\n')

    return {
      text: transformed,
      selectionStart: 0,
      selectionEnd: transformed.length,
    }
  })
}

function applyHeading(level = 2) {
  const headingPrefix = `${'#'.repeat(level)} `

  applySelection((selectedText) => {
    const content = selectedText || 'Heading'
    const transformed = content
      .split('\n')
      .map((line) => `${headingPrefix}${line.replace(/^\s{0,3}#{1,6}\s+/, '')}`)
      .join('\n')

    return {
      text: transformed,
      selectionStart: headingPrefix.length,
      selectionEnd: transformed.length,
    }
  })
}

function toggleLinePrefix(prefix: string, placeholder: string) {
  applySelection((selectedText) => {
    const content = selectedText || placeholder
    const lines = content.split('\n')
    const shouldUnwrap = lines.every((line) => line.startsWith(prefix))
    const transformed = lines
      .map((line) => {
        if (!line.trim()) {
          return shouldUnwrap ? line : prefix
        }

        return shouldUnwrap && line.startsWith(prefix)
          ? line.slice(prefix.length)
          : `${prefix}${line}`
      })
      .join('\n')

    return {
      text: transformed,
      selectionStart: 0,
      selectionEnd: transformed.length,
    }
  })
}

function applyInlineCode() {
  applySelection((selectedText) => {
    const content = selectedText || 'code'

    if (content.includes('\n')) {
      const fenced = `\`\`\`\n${content}\n\`\`\``

      return {
        text: fenced,
        selectionStart: 4,
        selectionEnd: 4 + content.length,
      }
    }

    return {
      text: `\`${content}\``,
      selectionStart: 1,
      selectionEnd: 1 + content.length,
    }
  })
}

function applyCodeBlock() {
  applySelection((selectedText) => {
    const content = selectedText || 'code'
    const fenced = `\`\`\`\n${content}\n\`\`\``

    return {
      text: fenced,
      selectionStart: 4,
      selectionEnd: 4 + content.length,
    }
  })
}

function applyLink() {
  applySelection((selectedText) => {
    const content = selectedText || 'Link text'
    const markdown = `[${content}](https://example.com)`

    return {
      text: markdown,
      selectionStart: 1,
      selectionEnd: 1 + content.length,
    }
  })
}

function applyImage() {
  applySelection((selectedText) => {
    const content = selectedText || 'Alt text'
    const markdown = `![${content}](https://example.com/image.png)`

    return {
      text: markdown,
      selectionStart: 2,
      selectionEnd: 2 + content.length,
    }
  })
}

function applyTable() {
  applySelection(() => {
    const table = '| Column 1 | Column 2 |\n| --- | --- |\n| Value 1 | Value 2 |'

    return {
      text: table,
      selectionStart: 2,
      selectionEnd: 10,
    }
  })
}

function applyHorizontalRule() {
  applySelection(() => ({
    text: '---',
    selectionStart: 3,
    selectionEnd: 3,
  }))
}

function applySelection(transform: (selectedText: string) => MarkdownTransformResult) {
  const instance = editor.value
  const model = instance?.getModel()
  const selection = instance?.getSelection()

  if (!instance || !model || !selection) {
    const result = transform('')
    const separator = inputValue.value && !inputValue.value.endsWith('\n') ? '\n' : ''
    inputValue.value = `${inputValue.value}${separator}${result.text}`
    return
  }

  const selectedText = model.getValueInRange(selection)
  const startOffset = model.getOffsetAt({
    lineNumber: selection.startLineNumber,
    column: selection.startColumn,
  })
  const result = transform(selectedText)

  instance.executeEdits('sapling-markdown-toolbar', [
    {
      range: selection,
      text: result.text,
      forceMoveMarkers: true,
    },
  ])

  const nextValue = model.getValue()
  if (nextValue !== inputValue.value) {
    inputValue.value = nextValue
  }

  const nextStart = startOffset + (result.selectionStart ?? result.text.length)
  const nextEnd = startOffset + (result.selectionEnd ?? result.text.length)

  instance.setSelection(toEditorRange(model, nextStart, nextEnd))
  instance.focus()
}

function toEditorRange(
  model: MarkdownEditorModel,
  startOffset: number,
  endOffset: number,
): MarkdownEditorRange {
  const start = model.getPositionAt(startOffset)
  const end = model.getPositionAt(endOffset)

  return {
    startLineNumber: start.lineNumber,
    startColumn: start.column,
    endLineNumber: end.lineNumber,
    endColumn: end.column,
  }
}

const toolbarActions = [
  {
    key: 'heading1',
    icon: 'mdi-format-header-1',
    title: 'Heading 1',
    run: () => applyHeading(1),
  },
  {
    key: 'heading',
    icon: 'mdi-format-header-2',
    title: 'Heading 2',
    run: () => applyHeading(2),
  },
  {
    key: 'heading3',
    icon: 'mdi-format-header-3',
    title: 'Heading 3',
    run: () => applyHeading(3),
  },
  {
    key: 'bold',
    icon: 'mdi-format-bold',
    title: 'Bold',
    run: () => wrapSelection('**'),
  },
  {
    key: 'italic',
    icon: 'mdi-format-italic',
    title: 'Italic',
    run: () => wrapSelection('_'),
  },
  {
    key: 'strike',
    icon: 'mdi-format-strikethrough',
    title: 'Strikethrough',
    run: () => wrapSelection('~~'),
  },
  {
    key: 'link',
    icon: 'mdi-link-variant',
    title: 'Link',
    run: applyLink,
  },
  {
    key: 'image',
    icon: 'mdi-image-outline',
    title: 'Image',
    run: applyImage,
  },
  {
    key: 'list',
    icon: 'mdi-format-list-bulleted',
    title: 'Bullet list',
    run: () => toggleLinePrefix('- ', 'List item'),
  },
  {
    key: 'ordered-list',
    icon: 'mdi-format-list-numbered',
    title: 'Numbered list',
    run: applyOrderedList,
  },
  {
    key: 'checklist',
    icon: 'mdi-format-list-checks',
    title: 'Checklist',
    run: applyChecklist,
  },
  {
    key: 'quote',
    icon: 'mdi-format-quote-close',
    title: 'Quote',
    run: () => toggleLinePrefix('> ', 'Quote'),
  },
  {
    key: 'inline-code',
    icon: 'mdi-code-tags',
    title: 'Inline code',
    run: applyInlineCode,
  },
  {
    key: 'code-block',
    icon: 'mdi-code-braces-box',
    title: 'Code block',
    run: applyCodeBlock,
  },
  {
    key: 'table',
    icon: 'mdi-table-large',
    title: 'Table',
    run: applyTable,
  },
  {
    key: 'divider',
    icon: 'mdi-minus',
    title: 'Horizontal rule',
    run: applyHorizontalRule,
  },
] as const
</script>
