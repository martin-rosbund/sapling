<template>
  <v-card flat class="sapling-markdown-field">
    <v-expansion-panels variant="accordion" class="mb-2" v-model="panel" multiple>
      <v-expansion-panel class="glass-panel">
        <v-expansion-panel-title>
          {{ label }}
        </v-expansion-panel-title>
        <v-expansion-panel-text>
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
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
    <div v-if="showPreview" class="sapling-markdown-preview">
      <VueMarkdownRender
        :source="previewSource"
        :options="previewOptions"
        :plugins="previewPlugins"
      />
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed, markRaw, ref, shallowRef } from 'vue';
import markdownItTaskLists from 'markdown-it-task-lists';
import MonacoEditor from 'monaco-editor-vue3';
import VueMarkdownRender from 'vue-markdown-render';
import CookieService from '@/services/cookie.service';

interface MarkdownRule {
  (value: string | null): boolean | string;
}

interface MarkdownEditorPosition {
  lineNumber: number;
  column: number;
}

interface MarkdownEditorRange {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

interface MarkdownEditorSelection extends MarkdownEditorRange {
  isEmpty(): boolean;
}

interface MarkdownEditorModel {
  getValue(): string;
  getValueInRange(range: MarkdownEditorRange): string;
  getOffsetAt(position: MarkdownEditorPosition): number;
  getPositionAt(offset: number): MarkdownEditorPosition;
}

interface MarkdownEditorInstance {
  getModel(): MarkdownEditorModel | null;
  getSelection(): MarkdownEditorSelection | null;
  executeEdits(
    source: string,
    edits: Array<{ range: MarkdownEditorRange; text: string; forceMoveMarkers?: boolean }>,
  ): void;
  setSelection(range: MarkdownEditorRange): void;
  focus(): void;
}

interface MarkdownTransformResult {
  text: string;
  selectionStart?: number;
  selectionEnd?: number;
}

const props = withDefaults(defineProps<{
  modelValue?: string;
  label?: string;
  rows?: number;
  showPreview?: boolean;
  disabled?: boolean;
  required?: boolean;
  rules?: MarkdownRule[];
}>(), {
  modelValue: '',
  label: 'Markdown',
  rows: 6,
  showPreview: true,
  disabled: false,
  required: false,
  rules: () => [],
});

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
}>();

const inputValue = computed({
  get: () => props.modelValue ?? '',
  set: (value: string) => emit('update:modelValue', value),
});
const panel = ref<number[]>([0]);
const editor = shallowRef<MarkdownEditorInstance | null>(null);

const editorTheme = computed(() => CookieService.get('theme') === 'dark' ? 'vs-dark' : 'vs');
const editorHeight = computed(() => `${Math.max(props.rows, 6) * 24 + 56}px`);
const previewSource = computed(() => (inputValue.value ?? '').replace(/\r\n?/g, '\n'));
const previewOptions = Object.freeze({
  breaks: true,
  linkify: true,
});
const previewPlugins = [markdownItTaskLists];
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
}));

function handleEditorDidMount(instance: MarkdownEditorInstance) {
  editor.value = markRaw(instance);
}

function wrapSelection(prefix: string, suffix = prefix, placeholder = 'Text') {
  applySelection((selectedText) => {
    const content = selectedText || placeholder;

    return {
      text: `${prefix}${content}${suffix}`,
      selectionStart: prefix.length,
      selectionEnd: prefix.length + content.length,
    };
  });
}

function applyOrderedList() {
  applySelection((selectedText) => {
    const content = selectedText || 'List item';
    const lines = content.split('\n');
    const shouldUnwrap = lines.every((line, index) => line.startsWith(`${index + 1}. `));
    const transformed = lines
      .map((line, index) => {
        const prefix = `${index + 1}. `;

        if (!line.trim()) {
          return shouldUnwrap ? line : prefix;
        }

        return shouldUnwrap && line.startsWith(prefix)
          ? line.slice(prefix.length)
          : `${prefix}${line}`;
      })
      .join('\n');

    return {
      text: transformed,
      selectionStart: 0,
      selectionEnd: transformed.length,
    };
  });
}

function applyChecklist() {
  applySelection((selectedText) => {
    const content = selectedText || 'Task';
    const lines = content.split('\n');
    const uncheckedPrefix = '- [ ] ';
    const checkedPrefix = '- [x] ';
    const shouldUnwrap = lines.every(
      (line) => line.startsWith(uncheckedPrefix) || line.startsWith(checkedPrefix),
    );
    const transformed = lines
      .map((line) => {
        if (!line.trim()) {
          return shouldUnwrap ? line : uncheckedPrefix;
        }

        if (shouldUnwrap) {
          if (line.startsWith(uncheckedPrefix)) {
            return line.slice(uncheckedPrefix.length);
          }

          if (line.startsWith(checkedPrefix)) {
            return line.slice(checkedPrefix.length);
          }
        }

        return `${uncheckedPrefix}${line}`;
      })
      .join('\n');

    return {
      text: transformed,
      selectionStart: 0,
      selectionEnd: transformed.length,
    };
  });
}

function applyHeading(level = 2) {
  const headingPrefix = `${'#'.repeat(level)} `;

  applySelection((selectedText) => {
    const content = selectedText || 'Heading';
    const transformed = content
      .split('\n')
      .map((line) => `${headingPrefix}${line.replace(/^\s{0,3}#{1,6}\s+/, '')}`)
      .join('\n');

    return {
      text: transformed,
      selectionStart: headingPrefix.length,
      selectionEnd: transformed.length,
    };
  });
}

function toggleLinePrefix(prefix: string, placeholder: string) {
  applySelection((selectedText) => {
    const content = selectedText || placeholder;
    const lines = content.split('\n');
    const shouldUnwrap = lines.every((line) => line.startsWith(prefix));
    const transformed = lines
      .map((line) => {
        if (!line.trim()) {
          return shouldUnwrap ? line : prefix;
        }

        return shouldUnwrap && line.startsWith(prefix)
          ? line.slice(prefix.length)
          : `${prefix}${line}`;
      })
      .join('\n');

    return {
      text: transformed,
      selectionStart: 0,
      selectionEnd: transformed.length,
    };
  });
}

function applyInlineCode() {
  applySelection((selectedText) => {
    const content = selectedText || 'code';

    if (content.includes('\n')) {
      const fenced = `\`\`\`\n${content}\n\`\`\``;

      return {
        text: fenced,
        selectionStart: 4,
        selectionEnd: 4 + content.length,
      };
    }

    return {
      text: `\`${content}\``,
      selectionStart: 1,
      selectionEnd: 1 + content.length,
    };
  });
}

function applyCodeBlock() {
  applySelection((selectedText) => {
    const content = selectedText || 'code';
    const fenced = `\`\`\`\n${content}\n\`\`\``;

    return {
      text: fenced,
      selectionStart: 4,
      selectionEnd: 4 + content.length,
    };
  });
}

function applyLink() {
  applySelection((selectedText) => {
    const content = selectedText || 'Link text';
    const markdown = `[${content}](https://example.com)`;

    return {
      text: markdown,
      selectionStart: 1,
      selectionEnd: 1 + content.length,
    };
  });
}

function applyImage() {
  applySelection((selectedText) => {
    const content = selectedText || 'Alt text';
    const markdown = `![${content}](https://example.com/image.png)`;

    return {
      text: markdown,
      selectionStart: 2,
      selectionEnd: 2 + content.length,
    };
  });
}

function applyTable() {
  applySelection(() => {
    const table = '| Column 1 | Column 2 |\n| --- | --- |\n| Value 1 | Value 2 |';

    return {
      text: table,
      selectionStart: 2,
      selectionEnd: 10,
    };
  });
}

function applyHorizontalRule() {
  applySelection(() => ({
    text: '---',
    selectionStart: 3,
    selectionEnd: 3,
  }));
}

function applySelection(transform: (selectedText: string) => MarkdownTransformResult) {
  const instance = editor.value;
  const model = instance?.getModel();
  const selection = instance?.getSelection();

  if (!instance || !model || !selection) {
    const result = transform('');
    const separator = inputValue.value && !inputValue.value.endsWith('\n') ? '\n' : '';
    inputValue.value = `${inputValue.value}${separator}${result.text}`;
    return;
  }

  const selectedText = model.getValueInRange(selection);
  const startOffset = model.getOffsetAt({
    lineNumber: selection.startLineNumber,
    column: selection.startColumn,
  });
  const result = transform(selectedText);

  instance.executeEdits('sapling-markdown-toolbar', [{
    range: selection,
    text: result.text,
    forceMoveMarkers: true,
  }]);

  const nextValue = model.getValue();
  if (nextValue !== inputValue.value) {
    inputValue.value = nextValue;
  }

  const nextStart = startOffset + (result.selectionStart ?? result.text.length);
  const nextEnd = startOffset + (result.selectionEnd ?? result.text.length);

  instance.setSelection(toEditorRange(model, nextStart, nextEnd));
  instance.focus();
}

function toEditorRange(model: MarkdownEditorModel, startOffset: number, endOffset: number): MarkdownEditorRange {
  const start = model.getPositionAt(startOffset);
  const end = model.getPositionAt(endOffset);

  return {
    startLineNumber: start.lineNumber,
    startColumn: start.column,
    endLineNumber: end.lineNumber,
    endColumn: end.column,
  };
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
] as const;
</script>

<style scoped>
.sapling-markdown-field {
  width: 100%;
}

.sapling-markdown-input {
  position: relative;
  width: 100%;
}

.sapling-markdown-input--disabled {
  cursor: not-allowed;
}

.sapling-markdown-validation-proxy {
  position: absolute;
  inset: 0;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.sapling-markdown-validation-proxy :deep(.v-input__details) {
  display: none;
}

.sapling-markdown-editor-shell {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: rgba(10, 15, 25, 0.5);
}

.sapling-markdown-editor-shell--disabled {
  opacity: 0.72;
}

.sapling-markdown-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0.65rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.sapling-markdown-editor {
  width: 100%;
}

.sapling-markdown-preview {
  padding: 1em;
  min-height: 80px;
  font-size: 1em;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  overflow-x: auto;
}

.sapling-markdown-preview :deep(*:first-child) {
  margin-top: 0;
}

.sapling-markdown-preview :deep(*:last-child) {
  margin-bottom: 0;
}

.sapling-markdown-preview :deep(h1),
.sapling-markdown-preview :deep(h2),
.sapling-markdown-preview :deep(h3),
.sapling-markdown-preview :deep(h4),
.sapling-markdown-preview :deep(h5),
.sapling-markdown-preview :deep(h6) {
  margin: 1.2rem 0 0.75rem;
  line-height: 1.25;
}

.sapling-markdown-preview :deep(p),
.sapling-markdown-preview :deep(ul),
.sapling-markdown-preview :deep(ol),
.sapling-markdown-preview :deep(blockquote),
.sapling-markdown-preview :deep(table) {
  margin: 0 0 1rem;
}

.sapling-markdown-preview :deep(ul),
.sapling-markdown-preview :deep(ol) {
  padding-left: 1.4rem;
}

.sapling-markdown-preview :deep(li + li) {
  margin-top: 0.25rem;
}

.sapling-markdown-preview :deep(blockquote) {
  margin-left: 0;
  padding: 0.75rem 1rem;
  border-left: 4px solid rgba(120, 180, 255, 0.45);
  border-radius: 0 12px 12px 0;
  background: rgba(120, 180, 255, 0.08);
}

.sapling-markdown-preview :deep(hr) {
  border: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  margin: 1.25rem 0;
}

.sapling-markdown-preview :deep(a) {
  color: rgb(120, 180, 255);
  text-decoration: none;
}

.sapling-markdown-preview :deep(a:hover) {
  text-decoration: underline;
}

.sapling-markdown-preview :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 12px;
}

.sapling-markdown-preview :deep(table) {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
}

.sapling-markdown-preview :deep(th),
.sapling-markdown-preview :deep(td) {
  padding: 0.7rem 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-align: left;
  vertical-align: top;
}

.sapling-markdown-preview :deep(th) {
  font-weight: 600;
  background: rgba(255, 255, 255, 0.07);
}

.sapling-markdown-preview :deep(tr:nth-child(even) td) {
  background: rgba(255, 255, 255, 0.025);
}

.sapling-markdown-preview :deep(pre) {
  overflow-x: auto;
  padding: 0.75rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.22);
}

.sapling-markdown-preview :deep(code) {
  font-family: Consolas, 'Courier New', monospace;
}

.sapling-markdown-preview :deep(.task-list-item) {
  list-style: none;
}

.sapling-markdown-preview :deep(.task-list-item input[type='checkbox']) {
  margin-right: 0.5rem;
}
</style>
