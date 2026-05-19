import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CookieService from '@/services/cookie.service'
import type {
  MarkdownEditorHandle,
  MarkdownToolbarAction,
  MarkdownTransformResult,
} from '@/components/dialog/fields/markdown/markdownField.types'

const MARKDOWN_SYNC_DEBOUNCE_MS = 120

export function useSaplingMarkdownField(options: {
  modelValue: () => string | undefined
  rows: () => number
  label: () => string | undefined
  emit: (event: 'update:modelValue' | 'focus', value?: string) => void
}) {
  const { locale, t } = useI18n()

  const draftValue = ref(options.modelValue() ?? '')
  const previewValue = ref(options.modelValue() ?? '')
  const editor = ref<MarkdownEditorHandle | null>(null)
  const isEnhancedEditorReady = ref(false)
  const resolvedLabel = computed(() => options.label() || t('global.markdown'))
  const editorTheme = computed(() => (CookieService.get('theme') === 'dark' ? 'dark' : 'light'))
  const editorHeight = computed(() => `${Math.max(options.rows(), 6) * 24 + 56}px`)
  const refreshPreviewLabel = computed(() => (locale.value === 'de' ? 'Aktualisieren' : 'Refresh'))

  let isApplyingExternalValue = false
  let syncTimeout: ReturnType<typeof setTimeout> | null = null
  let enhanceTimeout: ReturnType<typeof setTimeout> | null = null

  function flushSync(value = draftValue.value) {
    options.emit('update:modelValue', value)
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

  function refreshPreview() {
    previewValue.value = draftValue.value
  }

  watch(draftValue, (value) => {
    if (isApplyingExternalValue) {
      return
    }

    scheduleSync(value)
  })

  watch(options.modelValue, (value) => {
    const nextValue = value ?? ''

    if (nextValue === draftValue.value) {
      return
    }

    isApplyingExternalValue = true
    draftValue.value = nextValue
    previewValue.value = nextValue
    isApplyingExternalValue = false
  })

  onMounted(() => {
    enhanceTimeout = setTimeout(() => {
      enhanceTimeout = null
      isEnhancedEditorReady.value = true
    }, 20)
  })

  onBeforeUnmount(() => {
    if (syncTimeout) {
      clearTimeout(syncTimeout)
      syncTimeout = null
      flushSync()
    }

    if (enhanceTimeout) {
      clearTimeout(enhanceTimeout)
      enhanceTimeout = null
    }
  })

  function insertTextAtCursor(text: string) {
    applySelection(() => ({
      text,
      selectionStart: text.length,
      selectionEnd: text.length,
    }))
  }

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

    if (!instance) {
      const result = transform('')
      const separator = draftValue.value && !draftValue.value.endsWith('\n') ? '\n' : ''
      draftValue.value = `${draftValue.value}${separator}${result.text}`
      return
    }

    const nextValue = instance.applySelection(transform)
    if (nextValue !== draftValue.value) {
      draftValue.value = nextValue ?? draftValue.value
    }

    instance.focus()
  }

  const toolbarActions = computed<MarkdownToolbarAction[]>(() => [
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

  return {
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
  }
}
