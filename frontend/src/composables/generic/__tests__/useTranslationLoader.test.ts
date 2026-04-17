import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { i18n } from '@/i18n'

const { prepareMock } = vi.hoisted(() => ({
  prepareMock: vi.fn(),
}))

vi.mock('@/services/translation.service', () => ({
  default: class TranslationServiceMock {
    prepare = prepareMock
  },
}))

import { useTranslationLoader } from '../useTranslationLoader'

function createTestHost(...namespaces: string[]) {
  return defineComponent({
    setup() {
      return useTranslationLoader(...namespaces)
    },
    template: '<div />',
  })
}

const mountedWrappers: Array<ReturnType<typeof mount>> = []

function mountTestHost(...namespaces: string[]) {
  const wrapper = mount(createTestHost(...namespaces))
  mountedWrappers.push(wrapper)
  return wrapper
}

describe('useTranslationLoader', () => {
  beforeEach(() => {
    prepareMock.mockReset()
    i18n.global.locale.value = 'de'
  })

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
  })

  it('loads translations on mount and reuses the same locale cache', async () => {
    prepareMock.mockResolvedValue([])

    const wrapper = mountTestHost('ticket', 'company')
    await flushPromises()

    await wrapper.vm.loadTranslations()
    await flushPromises()

    expect(prepareMock).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.isLoading).toBe(false)
  })

  it('loads again when the locale changes', async () => {
    prepareMock.mockResolvedValue([])
    i18n.global.locale.value = 'fr'

    mountTestHost('note', 'person')
    await flushPromises()

    i18n.global.locale.value = 'en'
    await nextTick()
    await flushPromises()

    expect(prepareMock).toHaveBeenCalledTimes(2)
  })

  it('clears failed cache entries so a later retry can succeed', async () => {
    i18n.global.locale.value = 'it'
    prepareMock.mockRejectedValueOnce(new Error('temporary'))
    prepareMock.mockResolvedValueOnce([])

    const wrapper = mountTestHost('mail')
    await flushPromises()

    expect(wrapper.vm.isLoading).toBe(false)

    await wrapper.vm.loadTranslations()
    await flushPromises()

    expect(prepareMock).toHaveBeenCalledTimes(2)
    expect(wrapper.vm.isLoading).toBe(false)
  })
})
