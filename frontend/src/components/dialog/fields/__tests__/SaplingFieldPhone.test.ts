import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { openPhoneDialogMock } = vi.hoisted(() => ({
  openPhoneDialogMock: vi.fn(),
}))

vi.mock('@/composables/dialog/useSaplingPhoneDialog', () => ({
  useSaplingPhoneDialog: () => ({
    openPhoneDialog: openPhoneDialogMock,
  }),
}))

import SaplingFieldPhone from '../SaplingFieldPhone.vue'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'

function mountPhoneField(modelValue: string) {
  return mount(SaplingFieldPhone, {
    props: {
      label: 'Phone',
      modelValue,
      placeholder: 'Enter phone number',
    },
    global: {
      stubs: {
        'v-text-field': {
          template: '<input />',
        },
      },
    },
  })
}

describe('SaplingFieldPhone', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    openPhoneDialogMock.mockReset()
  })

  it('emits a formatted value immediately for prefilled local numbers', async () => {
    const currentPersonStore = useCurrentPersonStore()
    currentPersonStore.person = {
      company: {
        country: {
          handle: 'de',
          dialingCode: '+49',
        },
      },
    } as never

    const wrapper = mountPhoneField('0170 1234567')
    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toEqual([['+49 170 1234567']])
  })

  it('does not emit on mount when the value is already normalized', async () => {
    const currentPersonStore = useCurrentPersonStore()
    currentPersonStore.person = {
      company: {
        country: {
          handle: 'de',
          dialingCode: '+49',
        },
      },
    } as never

    const wrapper = mountPhoneField('+49 170 1234567')
    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
