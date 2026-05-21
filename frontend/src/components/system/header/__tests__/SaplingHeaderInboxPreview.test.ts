import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import SaplingHeaderInboxPreview from '../SaplingHeaderInboxPreview.vue'
import type { SaplingHeaderInboxPreview as SaplingHeaderInboxPreviewItem } from '@/composables/system/useSaplingHeader'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

function createPreview(): SaplingHeaderInboxPreviewItem {
  return {
    id: 'ticket:1',
    kind: 'ticket',
    title: 'New ticket',
    bodyText: 'Please take a look',
    icon: 'mdi-ticket-confirmation-outline',
    timestamp: Date.now(),
    route: '/table/ticket',
    sequence: 1,
  }
}

describe('SaplingHeaderInboxPreview', () => {
  it('emits the preview route target when clicked', async () => {
    const preview = createPreview()
    const wrapper = mount(SaplingHeaderInboxPreview, {
      props: {
        preview,
      },
      global: {
        stubs: {
          VIcon: true,
          Teleport: true,
          Transition: false,
        },
      },
    })

    const trigger = wrapper.get('button.sapling-header__inbox-preview')
    expect(trigger.attributes('aria-label')).toBe(`navigation.inbox: ${preview.title}`)

    await trigger.trigger('click')

    expect(wrapper.emitted('open')).toEqual([[preview]])
  })
})
