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
            <span class="sapling-markdown-pane__eyebrow">{{ t('global.markdown') }}</span>
            <h3 class="sapling-markdown-pane__title">{{ resolvedLabel }}</h3>
          </div>
        </header>

        <div
          class="sapling-markdown-input"
          :class="{ 'sapling-markdown-input--disabled': disabled }"
        >
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
              v-model:value="draftValue"
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
            <span class="sapling-markdown-pane__eyebrow">{{ t('global.live') }}</span>
            <h3 class="sapling-markdown-pane__title">{{ t('document.preview') }}</h3>
          </div>
        </header>

        <div class="sapling-markdown-preview">
          <SaplingMarkdownContent :source="previewValue" />
        </div>
      </section>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import MonacoEditor from 'monaco-editor-vue3'
import SaplingMarkdownContent from '@/components/common/SaplingMarkdownContent.vue'
import CookieService from '@/services/cookie.service'

const MARKDOWN_SYNC_DEBOUNCE_MS = 120

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
}>()
const { t } = useI18n()

const draftValue = ref(props.modelValue ?? '')
const previewValue = ref(props.modelValue ?? '')
const editor = shallowRef<MarkdownEditorInstance | null>(null)
const resolvedLabel = computed(() => props.label || t('global.markdown'))
let isApplyingExternalValue = false
let syncTimeout: ReturnType<typeof setTimeout> | null = null

const editorTheme = computed(() => (CookieService.get('theme') === 'dark' ? 'vs-dark' : 'vs'))
const editorHeight = computed(() => `${Math.max(props.rows, 6) * 24 + 56}px`)
const editorOptions = computed(() => ({
  automaticLayout: true,
  minimap: { enabled: false },
  scrollbar: {
    alwaysConsumeMouseWheel: false,
    handleMouseWheel: false,
  },
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

function flushSync(value = draftValue.value) {
  previewValue.value = value
  emit('update:modelValue', value)
}

function scheduleSync(value = draftValue.value) {
  if (syncTimeout) {
    clearTimeout(syncTimeout)
  }

  syncTimeout = setTimeout(() => {
    syncTimeout = null
    flushSync(value)
  }, MARKDOWN_SYNC_DEBOUNCE_MS)
}

watch(draftValue, (value) => {
  if (isApplyingExternalValue) {
    return
  }

  scheduleSync(value)
})

watch(
  () => props.modelValue,
  (value) => {
    const nextValue = value ?? ''

    if (nextValue === draftValue.value && nextValue === previewValue.value) {
      return
    }

    if (syncTimeout) {
      clearTimeout(syncTimeout)
      syncTimeout = null
    }

    isApplyingExternalValue = true
    draftValue.value = nextValue
    previewValue.value = nextValue
    isApplyingExternalValue = false
  },
)

onBeforeUnmount(() => {
  if (syncTimeout) {
    clearTimeout(syncTimeout)
    syncTimeout = null
    flushSync()
  }
})

function wrapSelection(prefix: string, suffix = prefix, placeholder?: string) {
  applySelection((selectedText) => {
    const content = selectedText || placeholder || t('global.text')

    return {
      text: `${prefix}${content}${suffix}`,
      selectionStart: prefix.length,
      selectionEnd: prefix.length + content.length,
    }
  })
}

function applyOrderedList() {
  applySelection((selectedText) => {
    const content = selectedText || t('global.listItem')
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
    const content = selectedText || t('global.task')
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
    const content = selectedText || t('global.heading')
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
    const content = selectedText || t('global.code')

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
    const content = selectedText || t('global.code')
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
    const content = selectedText || t('global.linkText')
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
    const content = selectedText || t('global.altText')
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
    const table = `| ${t('global.column')} 1 | ${t('global.column')} 2 |\n| --- | --- |\n| ${t('global.value')} 1 | ${t('global.value')} 2 |`

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
    const separator = draftValue.value && !draftValue.value.endsWith('\n') ? '\n' : ''
    draftValue.value = `${draftValue.value}${separator}${result.text}`
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
  if (nextValue !== draftValue.value) {
    draftValue.value = nextValue
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

const toolbarActions = computed(() => [
  {
    key: 'heading1',
    icon: 'mdi-format-header-1',
    title: t('global.heading1'),
    run: () => applyHeading(1),
  },
  {
    key: 'heading',
    icon: 'mdi-format-header-2',
    title: t('global.heading2'),
    run: () => applyHeading(2),
  },
  {
    key: 'heading3',
    icon: 'mdi-format-header-3',
    title: t('global.heading3'),
    run: () => applyHeading(3),
  },
  {
    key: 'bold',
    icon: 'mdi-format-bold',
    title: t('global.bold'),
    run: () => wrapSelection('**'),
  },
  {
    key: 'italic',
    icon: 'mdi-format-italic',
    title: t('global.italic'),
    run: () => wrapSelection('_'),
  },
  {
    key: 'strike',
    icon: 'mdi-format-strikethrough',
    title: t('global.strikethrough'),
    run: () => wrapSelection('~~'),
  },
  {
    key: 'link',
    icon: 'mdi-link-variant',
    title: t('global.link'),
    run: applyLink,
  },
  {
    key: 'image',
    icon: 'mdi-image-outline',
    title: t('global.image'),
    run: applyImage,
  },
  {
    key: 'list',
    icon: 'mdi-format-list-bulleted',
    title: t('global.bulletList'),
    run: () => toggleLinePrefix('- ', t('global.listItem')),
  },
  {
    key: 'ordered-list',
    icon: 'mdi-format-list-numbered',
    title: t('global.numberedList'),
    run: applyOrderedList,
  },
  {
    key: 'checklist',
    icon: 'mdi-format-list-checks',
    title: t('global.checklist'),
    run: applyChecklist,
  },
  {
    key: 'quote',
    icon: 'mdi-format-quote-close',
    title: t('global.quote'),
    run: () => toggleLinePrefix('> ', t('global.quote')),
  },
  {
    key: 'inline-code',
    icon: 'mdi-code-tags',
    title: t('global.inlineCode'),
    run: applyInlineCode,
  },
  {
    key: 'code-block',
    icon: 'mdi-code-braces-box',
    title: t('global.codeBlock'),
    run: applyCodeBlock,
  },
  {
    key: 'table',
    icon: 'mdi-table-large',
    title: t('global.table'),
    run: applyTable,
  },
  {
    key: 'divider',
    icon: 'mdi-minus',
    title: t('global.horizontalRule'),
    run: applyHorizontalRule,
  },
])
</script>
