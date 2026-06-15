import { i18n } from '@/i18n'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import ApiImportService, { type ImportBatchSummary } from '@/services/api.import.service'

const STORAGE_KEY = 'sapling.import.activeBatchHandles'
const POLL_INTERVAL_MS = 3000
const activeBatchHandles = new Set<number>()
let pollTimer: number | null = null
let isPolling = false

const TERMINAL_STATUS_MESSAGES: Record<
  string,
  { type: 'error' | 'success' | 'warning'; messageKey: string }
> = {
  validated: { type: 'success', messageKey: 'import.validationCompleted' },
  validatedWithErrors: { type: 'warning', messageKey: 'import.validationCompletedWithErrors' },
  validationFailed: { type: 'error', messageKey: 'import.validationFailed' },
  executed: { type: 'success', messageKey: 'import.executionCompleted' },
  executedWithErrors: { type: 'warning', messageKey: 'import.executionCompletedWithErrors' },
  executionFailed: { type: 'error', messageKey: 'import.executionFailed' },
}

export function useSaplingImportJobs() {
  const messageCenter = useSaplingMessageCenter()

  function startImportJobWatcher() {
    loadStoredHandles()
    ensureTimer()
    void pollImportJobs()
  }

  function stopImportJobWatcher() {
    if (pollTimer) {
      window.clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function trackImportBatch(handle: number | null | undefined) {
    if (typeof handle !== 'number' || !Number.isFinite(handle)) {
      return
    }

    activeBatchHandles.add(Math.trunc(handle))
    persistHandles()
    ensureTimer()
    void pollImportJobs()
  }

  function ensureTimer() {
    if (pollTimer || activeBatchHandles.size === 0) {
      return
    }

    pollTimer = window.setInterval(() => {
      void pollImportJobs()
    }, POLL_INTERVAL_MS)
  }

  async function pollImportJobs() {
    if (isPolling || activeBatchHandles.size === 0) {
      return
    }

    isPolling = true

    try {
      for (const handle of [...activeBatchHandles]) {
        try {
          const batch = await ApiImportService.getBatch(handle)
          handlePolledBatch(batch)
        } catch {
          // The shared API error handling already reports failed status loads.
        }
      }
    } finally {
      isPolling = false
      persistHandles()
      if (activeBatchHandles.size === 0 && pollTimer) {
        window.clearInterval(pollTimer)
        pollTimer = null
      }
    }
  }

  function handlePolledBatch(batch: ImportBatchSummary) {
    const handle = batch.handle
    if (typeof handle !== 'number') {
      return
    }

    const terminalMessage = TERMINAL_STATUS_MESSAGES[batch.status]
    if (!terminalMessage) {
      return
    }

    const description = batch.lastError || batch.filename
    messageCenter.pushMessage(
      terminalMessage.type,
      i18n.global.t(terminalMessage.messageKey),
      description,
      'import',
      batch.resultSummary,
    )
    activeBatchHandles.delete(handle)
  }

  function loadStoredHandles() {
    if (activeBatchHandles.size > 0) {
      return
    }

    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]') as unknown
      if (!Array.isArray(parsed)) {
        return
      }
      parsed
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
        .forEach((value) => activeBatchHandles.add(Math.trunc(value)))
    } catch {
      activeBatchHandles.clear()
    }
  }

  function persistHandles() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...activeBatchHandles]))
  }

  return {
    startImportJobWatcher,
    stopImportJobWatcher,
    trackImportBatch,
  }
}
