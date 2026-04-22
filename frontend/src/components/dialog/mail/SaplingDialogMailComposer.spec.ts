import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { i18n } from '@/i18n'
import SaplingDialogMailComposer from './SaplingDialogMailComposer.vue'

vi.mock('monaco-editor-vue3', () => ({
  default: defineComponent({
    name: 'MonacoEditorStub',
    props: {
      value: {
        type: String,
        default: '',
      },
    },
    emits: ['update:value', 'editorDidMount'],
    setup(props) {
      return () => h('div', { class: 'stub-monaco-editor' }, props.value)
    },
  }),
}))

const vuetify = createVuetify({
  components,
  directives,
})

const baseProps = {
  templates: [],
  templateHandle: null,
  toInput: 'info@schulz-bau.de',
  ccInput: '',
  bccInput: '',
  subject: '',
  bodyMarkdown: '',
  availableAttachments: [],
  attachmentHandles: [],
  attachmentSelectionSummary: '',
  isLoadingTemplates: false,
  isLoadingAttachments: false,
  hasItemHandle: false,
  translate: (key: string) => key,
}

describe('SaplingDialogMailComposer', () => {
  it('renders with a stubbed markdown field', () => {
    const wrapper = mount(SaplingDialogMailComposer, {
      props: baseProps,
      global: {
        plugins: [vuetify, i18n],
        stubs: {
          SaplingMarkdownField: {
            props: ['modelValue', 'label', 'rows', 'showPreview'],
            emits: ['update:modelValue'],
            render() {
              return h('div', { class: 'stub-markdown-field' }, this.label)
            },
          },
        },
      },
    })

    expect(wrapper.text()).toContain('document.to')
    expect(wrapper.find('.stub-markdown-field').exists()).toBe(true)
  })

  it('renders with the real markdown field', () => {
    const wrapper = mount(SaplingDialogMailComposer, {
      props: baseProps,
      global: {
        plugins: [vuetify, i18n],
      },
    })

    expect(wrapper.exists()).toBe(true)
  })
})
