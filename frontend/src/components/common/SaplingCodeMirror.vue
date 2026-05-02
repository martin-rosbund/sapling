<template>
  <div
    ref="host"
    class="sapling-codemirror"
    :class="{
      'sapling-codemirror--dark': isDarkTheme,
      'sapling-codemirror--light': !isDarkTheme,
      'sapling-codemirror--readonly': readOnly,
      'sapling-codemirror--no-line-numbers': !lineNumbers,
    }"
  />
</template>

<script setup lang="ts">
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import {
  bracketMatching,
  defaultHighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language'
import { Compartment, EditorState, type Extension } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import { computed, markRaw, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

interface CodeMirrorTransformResult {
  text: string
  selectionStart?: number
  selectionEnd?: number
}

const props = withDefaults(
  defineProps<{
    modelValue?: string
    language?: 'json' | 'markdown' | 'text'
    theme?: 'dark' | 'light' | 'vs-dark' | 'vs'
    readOnly?: boolean
    lineNumbers?: boolean
  }>(),
  {
    modelValue: '',
    language: 'text',
    theme: 'light',
    readOnly: false,
    lineNumbers: true,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'focus'): void
}>()

const host = ref<HTMLElement | null>(null)
const view = shallowRef<EditorView | null>(null)
const languageCompartment = new Compartment()
const editableCompartment = new Compartment()
const themeCompartment = new Compartment()

let isApplyingExternalValue = false

const isDarkTheme = computed(() => props.theme === 'dark' || props.theme === 'vs-dark')

const lightTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      color: 'var(--sapling-surface-text)',
      backgroundColor: 'var(--sapling-surface-fill)',
      fontSize: '0.92rem',
    },
    '&.cm-focused': {
      outline: 'none',
    },
    '.cm-scroller': {
      fontFamily: "Consolas, 'Courier New', monospace",
      overflow: 'auto',
    },
    '.cm-content': {
      minHeight: '100%',
      padding: '12px 0',
      caretColor: 'rgb(var(--v-theme-primary))',
    },
    '.cm-line': {
      padding: '0 14px',
    },
    '.cm-gutters': {
      borderRight: '1px solid var(--sapling-surface-border)',
      backgroundColor: 'var(--sapling-surface-fill-soft)',
      color: 'color-mix(in srgb, var(--sapling-surface-text) 58%, transparent)',
    },
    '.cm-activeLine, .cm-activeLineGutter': {
      backgroundColor: 'color-mix(in srgb, rgb(var(--v-theme-primary)) 8%, transparent)',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: 'color-mix(in srgb, rgb(var(--v-theme-primary)) 24%, transparent)',
    },
  },
  { dark: false },
)

const darkTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      color: 'rgba(255, 255, 255, 0.9)',
      backgroundColor: 'rgba(10, 14, 24, 0.94)',
      fontSize: '0.92rem',
    },
    '&.cm-focused': {
      outline: 'none',
    },
    '.cm-scroller': {
      fontFamily: "Consolas, 'Courier New', monospace",
      overflow: 'auto',
    },
    '.cm-content': {
      minHeight: '100%',
      padding: '12px 0',
      caretColor: 'rgb(var(--v-theme-primary))',
    },
    '.cm-line': {
      padding: '0 14px',
    },
    '.cm-gutters': {
      borderRight: '1px solid rgba(255, 255, 255, 0.1)',
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      color: 'rgba(255, 255, 255, 0.48)',
    },
    '.cm-activeLine, .cm-activeLineGutter': {
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: 'rgba(120, 180, 255, 0.28)',
    },
  },
  { dark: true },
)

function getLanguageExtension(): Extension {
  if (props.language === 'json') {
    return json()
  }

  if (props.language === 'markdown') {
    return markdown()
  }

  return []
}

function getEditableExtension(): Extension {
  return [EditorState.readOnly.of(props.readOnly), EditorView.editable.of(!props.readOnly)]
}

function getThemeExtension(): Extension {
  return isDarkTheme.value ? darkTheme : lightTheme
}

function getBaseExtensions(): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    drawSelection(),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    highlightActiveLine(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
  ]
}

function createEditor() {
  if (!host.value) {
    return
  }

  const state = EditorState.create({
    doc: props.modelValue,
    extensions: [
      getBaseExtensions(),
      languageCompartment.of(getLanguageExtension()),
      editableCompartment.of(getEditableExtension()),
      themeCompartment.of(getThemeExtension()),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.focusChanged && update.view.hasFocus) {
          emit('focus')
        }

        if (update.docChanged && !isApplyingExternalValue) {
          emit('update:modelValue', update.state.doc.toString())
        }
      }),
    ],
  })

  view.value = markRaw(new EditorView({ state, parent: host.value }))
}

function focus() {
  view.value?.focus()
}

function applySelection(
  transform: (selectedText: string) => CodeMirrorTransformResult,
): string | null {
  const instance = view.value

  if (!instance) {
    return null
  }

  const selection = instance.state.selection.main
  const selectedText = instance.state.sliceDoc(selection.from, selection.to)
  const result = transform(selectedText)
  const selectionStart = selection.from + (result.selectionStart ?? result.text.length)
  const selectionEnd = selection.from + (result.selectionEnd ?? result.text.length)

  instance.dispatch({
    changes: { from: selection.from, to: selection.to, insert: result.text },
    selection: { anchor: selectionStart, head: selectionEnd },
    scrollIntoView: true,
  })

  return instance.state.doc.toString()
}

watch(
  () => props.modelValue,
  (value) => {
    const instance = view.value

    if (!instance || value === instance.state.doc.toString()) {
      return
    }

    isApplyingExternalValue = true
    instance.dispatch({
      changes: { from: 0, to: instance.state.doc.length, insert: value ?? '' },
    })
    isApplyingExternalValue = false
  },
)

watch(
  () => props.language,
  () => {
    view.value?.dispatch({
      effects: languageCompartment.reconfigure(getLanguageExtension()),
    })
  },
)

watch(
  () => props.readOnly,
  () => {
    view.value?.dispatch({
      effects: editableCompartment.reconfigure(getEditableExtension()),
    })
  },
)

watch(isDarkTheme, () => {
  view.value?.dispatch({
    effects: themeCompartment.reconfigure(getThemeExtension()),
  })
})

onMounted(createEditor)

onBeforeUnmount(() => {
  view.value?.destroy()
  view.value = null
})

defineExpose({
  applySelection,
  focus,
})
</script>

<style>
.sapling-codemirror {
  width: 100%;
  min-height: 0;
  overflow: hidden;
  border-radius: inherit;
}

.sapling-codemirror .cm-editor {
  height: 100%;
}

.sapling-codemirror .cm-tooltip,
.sapling-codemirror .cm-panel {
  color: var(--sapling-surface-text);
  background: var(--sapling-surface-fill);
  border-color: var(--sapling-surface-border);
}

.sapling-codemirror--readonly .cm-content {
  cursor: default;
}

.sapling-codemirror--no-line-numbers .cm-gutters {
  display: none;
}
</style>
