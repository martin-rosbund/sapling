import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'

export interface ApiErrorPayload {
  message: string
  description: string
}

const messageCenter = useSaplingMessageCenter()

export function resolveApiError(
  error: unknown,
  fallbackMessage = 'exception.unknownError',
): ApiErrorPayload {
  let message = fallbackMessage
  let description = ''

  if (typeof error === 'object' && error !== null) {
    const err = error as {
      response?: { data?: { message?: string; error?: string } }
      message?: string
    }

    message = err.response?.data?.message || err.message || fallbackMessage
    description = err.response?.data?.error || ''
  }

  return { message, description }
}

export function pushApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
  context: string,
): void {
  const { message, description } = resolveApiError(error, fallbackMessage)
  messageCenter.pushMessage('error', message, description, context)
}
