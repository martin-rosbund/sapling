import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const pushMessage = vi.fn()
const getBatch = vi.fn()

vi.mock('@/i18n', () => ({
  i18n: {
    global: {
      t: (key: string) => key,
    },
  },
}))

vi.mock('@/composables/system/useSaplingMessageCenter', () => ({
  useSaplingMessageCenter: () => ({
    pushMessage,
  }),
}))

vi.mock('@/services/api.import.service', () => ({
  default: {
    getBatch,
  },
}))

describe('useSaplingImportJobs', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.localStorage.clear()
    pushMessage.mockClear()
    getBatch.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stores active import handles and reports terminal status once', async () => {
    getBatch.mockResolvedValue({
      handle: 42,
      status: 'executed',
      filename: 'contacts.csv',
      resultSummary: {
        totalRows: 2,
        processedRows: 2,
        readyRows: 2,
        errorRows: 0,
        createdRows: 2,
        updatedRows: 0,
        skippedRows: 0,
        failedRows: 0,
      },
    })
    const { useSaplingImportJobs } = await import('../useSaplingImportJobs')
    const { trackImportBatch, stopImportJobWatcher } = useSaplingImportJobs()

    trackImportBatch(42)
    await Promise.resolve()
    await Promise.resolve()

    expect(getBatch).toHaveBeenCalledWith(42)
    expect(pushMessage).toHaveBeenCalledWith(
      'success',
      'import.executionCompleted',
      'contacts.csv',
      'import',
      expect.objectContaining({ processedRows: 2 }),
    )
    expect(window.localStorage.getItem('sapling.import.activeBatchHandles')).toBe('[]')

    stopImportJobWatcher()
  })
})
