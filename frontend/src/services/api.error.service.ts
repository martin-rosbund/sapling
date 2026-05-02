import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import { useAuthStore } from '@/stores/authStore'

export interface ApiErrorPayload {
  message: string
  description: string
}

const messageCenter = useSaplingMessageCenter()
const HTTP_STATUS_EXCEPTION_KEYS: Record<number, string> = {
  400: 'exception.badRequest',
  401: 'exception.unauthorized',
  403: 'exception.forbidden',
  404: 'exception.notFound',
  409: 'exception.conflict',
  413: 'exception.payloadTooLarge',
  429: 'exception.tooManyRequests',
}

export function resolveApiError(
  error: unknown,
  fallbackMessage = 'exception.unknownError',
): ApiErrorPayload {
  let message = fallbackMessage
  let description = ''

  if (typeof error === 'object' && error !== null) {
    const err = error as {
      response?: { status?: number; data?: { message?: string; error?: string } | string }
      code?: string
    }
    const status = err.response?.status
    const responseData = err.response?.data
    const responseMessage =
      typeof responseData === 'object' && responseData !== null
        ? responseData.message
        : typeof responseData === 'string'
          ? responseData
          : ''
    const responseError =
      typeof responseData === 'object' && responseData !== null ? responseData.error : ''

    if (responseMessage?.startsWith('exception.')) {
      message = responseMessage
    } else if (typeof status === 'number' && HTTP_STATUS_EXCEPTION_KEYS[status]) {
      message = HTTP_STATUS_EXCEPTION_KEYS[status]
    } else if (err.code === 'ERR_NETWORK') {
      message = 'exception.connectionException'
    } else if (typeof status === 'number' && status >= 500) {
      message = 'exception.serverException'
    }

    description = responseError?.startsWith('exception.') ? responseError : ''
  }

  return { message, description }
}

export function pushApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
  context: string,
): void {
  const { message, description } = resolveApiError(error, fallbackMessage)
  if (message === 'exception.unauthorized') {
    useAuthStore().clear()
  }
  messageCenter.pushMessage('error', message, description, context)
}
