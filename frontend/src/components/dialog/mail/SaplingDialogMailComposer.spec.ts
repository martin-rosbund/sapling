import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { i18n } from '@/i18n'
import SaplingDialogMailComposer from './SaplingDialogMailComposer.vue'

vi.mock('@/components/common/SaplingCodeMirror.vue', () => ({
  default: defineComponent({
    name: 'SaplingCodeMirrorStub',
    props: {
      modelValue: {
        type: String,
        default: '',
      },
    },
    emits: ['update:modelValue', 'focus'],
    setup(props) {
      return () => h('div', { class: 'stub-codemirror-editor' }, props.modelValue)
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
  toRecipients: ['info@schulz-bau.de'],
  ccRecipients: [],
  bccRecipients: [],
  senderEmail: 'sender@example.com',
  selectedSenderEmail: 'sender@example.com',
  senderOptions: [],
  isLoadingSenderOptions: false,
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
