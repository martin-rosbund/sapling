import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { uploadDocumentMock, loadGenericMock, pushMessageMock } = vi.hoisted(() => ({
  uploadDocumentMock: vi.fn(),
  loadGenericMock: vi.fn(),
  pushMessageMock: vi.fn(),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (!params) {
        return key
      }

      return `${key}:${JSON.stringify(params)}`
    },
  }),
}))

vi.mock('@/services/api.service', () => ({
  default: {
    uploadDocument: uploadDocumentMock,
  },
}))

vi.mock('@/stores/genericStore', () => ({
  useGenericStore: () => ({
    loadGeneric: loadGenericMock,
    getState: () => ({
      isLoading: false,
    }),
  }),
}))

vi.mock('@/composables/system/useSaplingMessageCenter', () => ({
  useSaplingMessageCenter: () => ({
    pushMessage: pushMessageMock,
  }),
}))

import { useSaplingTableRowUpload } from '../useSaplingTableRowUpload'

const baseProps = reactive({
  show: true,
  item: { handle: 42 },
  entityHandle: 'company',
})

function createTestHost() {
  return defineComponent({
    props: {
      show: {
        type: Boolean,
        required: true,
      },
      item: {
        type: Object,
        required: false,
        default: null,
      },
      entityHandle: {
        type: String,
        required: true,
      },
    },
    emits: ['close', 'uploaded'],
    setup(props, { emit }) {
      return useSaplingTableRowUpload(props, emit)
    },
    template: '<div />',
  })
}

describe('useSaplingTableRowUpload', () => {
  beforeEach(() => {
    uploadDocumentMock.mockReset()
    loadGenericMock.mockReset()
    pushMessageMock.mockReset()
  })

  it('uploads multiple selected files sequentially and resets state on success', async () => {
    uploadDocumentMock.mockResolvedValue(undefined)

    const wrapper = mount(createTestHost(), {
      props: baseProps,
    })

    const firstFile = new File(['first'], 'first.txt', { type: 'text/plain' })
    const secondFile = new File(['second'], 'second.txt', { type: 'text/plain' })

    wrapper.vm.setFiles([firstFile, secondFile])
    wrapper.vm.description = 'Beleg'

    await wrapper.vm.onUpload()
    await flushPromises()

    expect(uploadDocumentMock).toHaveBeenCalledTimes(2)
    expect(uploadDocumentMock).toHaveBeenNthCalledWith(
      1,
      'company',
      '42',
      expect.any(FormData),
    )
    expect(uploadDocumentMock.mock.calls[0]?.[2].get('file')).toBe(firstFile)
    expect(uploadDocumentMock.mock.calls[1]?.[2].get('file')).toBe(secondFile)
    expect(pushMessageMock).toHaveBeenCalledWith(
      'success',
      'document.uploadCompleted',
      'document.uploadCompletedDescription:{"count":2}',
      'company',
    )
    expect(wrapper.emitted('uploaded')).toHaveLength(1)
    expect(wrapper.vm.files).toEqual([])
    expect(wrapper.vm.description).toBe('')
  })

  it('keeps failed files selected when at least one upload fails', async () => {
    const firstFile = new File(['first'], 'first.txt', { type: 'text/plain' })
    const secondFile = new File(['second'], 'second.txt', { type: 'text/plain' })

    uploadDocumentMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('upload failed'))

    const wrapper = mount(createTestHost(), {
      props: baseProps,
    })

    wrapper.vm.setFiles([firstFile, secondFile])

    await wrapper.vm.onUpload()
    await flushPromises()

    expect(uploadDocumentMock).toHaveBeenCalledTimes(2)
    expect(pushMessageMock).toHaveBeenCalledWith(
      'warning',
      'document.uploadCompleted',
      'document.uploadPartialDescription:{"successCount":1,"failedCount":1}',
      'company',
    )
    expect(wrapper.emitted('uploaded')).toBeUndefined()
    expect(wrapper.vm.files).toEqual([secondFile])
  })
})
