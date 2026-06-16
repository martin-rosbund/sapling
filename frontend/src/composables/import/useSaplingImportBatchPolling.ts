import ApiImportService, { type ImportBatchSummary } from '@/services/api.import.service'

const IMPORT_POLL_INTERVAL_MS = 2000

const IMPORT_RUNNING_STATUSES = new Set([
  'validationQueued',
  'validating',
  'executionQueued',
  'executing',
])

const IMPORT_TERMINAL_STATUSES = new Set([
  'validated',
  'validatedWithErrors',
  'validationFailed',
  'executed',
  'executedWithErrors',
  'executionFailed',
])

interface ImportBatchPollingOptions {
  onBatch: (batch: ImportBatchSummary) => void
  onTerminal?: (batch: ImportBatchSummary) => void | Promise<void>
}

export function useSaplingImportBatchPolling({
  onBatch,
  onTerminal,
}: ImportBatchPollingOptions) {
  let batchPollTimer: number | null = null

  function startBatchPolling(handle: number | null | undefined): void {
    if (typeof handle !== 'number' || !Number.isFinite(handle)) {
      return
    }

    stopBatchPolling()
    const normalizedHandle = Math.trunc(handle)
    batchPollTimer = window.setInterval(() => {
      void refreshBatchStatus(normalizedHandle)
    }, IMPORT_POLL_INTERVAL_MS)
    void refreshBatchStatus(normalizedHandle)
  }

  function stopBatchPolling(): void {
    if (!batchPollTimer) {
      return
    }

    window.clearInterval(batchPollTimer)
    batchPollTimer = null
  }

  async function refreshBatchStatus(handle: number): Promise<void> {
    try {
      const refreshedBatch = await ApiImportService.getBatch(handle)
      onBatch(refreshedBatch)

      if (isTerminalImportStatus(refreshedBatch.status)) {
        stopBatchPolling()
        await onTerminal?.(refreshedBatch)
      }
    } catch {
      // shared API errors already surface through the message center
    }
  }

  return {
    startBatchPolling,
    stopBatchPolling,
    refreshBatchStatus,
  }
}

export function isRunningImportStatus(status: string): boolean {
  return IMPORT_RUNNING_STATUSES.has(status)
}

export function isTerminalImportStatus(status: string): boolean {
  return IMPORT_TERMINAL_STATUSES.has(status)
}
