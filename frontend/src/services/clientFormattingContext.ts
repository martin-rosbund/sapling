import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'

const CLIENT_LOCALE_HEADER = 'x-sapling-client-locale'
const CLIENT_TIME_ZONE_HEADER = 'x-sapling-client-time-zone'

export function applyClientFormattingHeaders<T extends AxiosRequestConfig | InternalAxiosRequestConfig>(
  config: T,
): T {
  const headers = {
    ...(config.headers ?? {}),
  }
  const resolvedOptions = Intl.DateTimeFormat().resolvedOptions()
  const timeZone = resolvedOptions.timeZone?.trim()
  const locale =
    typeof navigator !== 'undefined'
      ? navigator.language || resolvedOptions.locale
      : resolvedOptions.locale

  if (locale && !headers[CLIENT_LOCALE_HEADER]) {
    headers[CLIENT_LOCALE_HEADER] = locale
  }

  if (timeZone && !headers[CLIENT_TIME_ZONE_HEADER]) {
    headers[CLIENT_TIME_ZONE_HEADER] = timeZone
  }

  config.headers = headers
  return config
}
