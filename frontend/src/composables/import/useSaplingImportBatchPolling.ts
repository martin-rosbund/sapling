import ApiImportService, {
  isImportBatchNotFoundError,
  type ImportBatchSummary,
} from '@/services/api.import.service'

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
  onNotFound?: (handle: number) => void
}

export function useSaplingImportBatchPolling({
  onBatch,
  onTerminal,
  onNotFound,
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
      const refreshedBatch = await ApiImportService.getBatch(handle, {
        suppressNotFoundError: true,
      })
      onBatch(refreshedBatch)

      if (isTerminalImportStatus(refreshedBatch.status)) {
        stopBatchPolling()
        await onTerminal?.(refreshedBatch)
      }
    } catch (error) {
      if (isImportBatchNotFoundError(error)) {
        stopBatchPolling()
        onNotFound?.(handle)
      }
      // Non-404 polling errors are still reported by the shared API handler.
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
