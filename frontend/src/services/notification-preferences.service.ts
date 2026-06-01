export interface SaplingNotificationPreferences {
  inboxNotificationsEnabled: boolean
  openTaskNotificationsEnabled: boolean
  badgeChannelEnabled: boolean
  previewChannelEnabled: boolean
  quietHoursEnabled: boolean
  quietHoursFrom: string
  quietHoursTo: string
}

export const SAPLING_NOTIFICATION_PREFERENCES_UPDATED_EVENT =
  'sapling:notification-preferences-updated'

const STORAGE_PREFIX = 'sapling.notificationPreference.'

const DEFAULT_NOTIFICATION_PREFERENCES: SaplingNotificationPreferences = {
  inboxNotificationsEnabled: true,
  openTaskNotificationsEnabled: true,
  badgeChannelEnabled: true,
  previewChannelEnabled: true,
  quietHoursEnabled: false,
  quietHoursFrom: '18:00',
  quietHoursTo: '08:00',
}

function readBoolean(
  key: keyof SaplingNotificationPreferences,
  fallback: boolean,
): boolean {
  if (typeof window === 'undefined') {
    return fallback
  }

  const value = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`)

  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return fallback
}

function readTime(key: keyof SaplingNotificationPreferences, fallback: string): string {
  if (typeof window === 'undefined') {
    return fallback
  }

  const value = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`)?.trim()
  return value && /^\d{2}:\d{2}$/.test(value) ? value : fallback
}

function writeValue(key: keyof SaplingNotificationPreferences, value: boolean | string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, String(value))
}

export function loadSaplingNotificationPreferences(): SaplingNotificationPreferences {
  return {
    inboxNotificationsEnabled: readBoolean(
      'inboxNotificationsEnabled',
      DEFAULT_NOTIFICATION_PREFERENCES.inboxNotificationsEnabled,
    ),
    openTaskNotificationsEnabled: readBoolean(
      'openTaskNotificationsEnabled',
      DEFAULT_NOTIFICATION_PREFERENCES.openTaskNotificationsEnabled,
    ),
    badgeChannelEnabled: readBoolean(
      'badgeChannelEnabled',
      DEFAULT_NOTIFICATION_PREFERENCES.badgeChannelEnabled,
    ),
    previewChannelEnabled: readBoolean(
      'previewChannelEnabled',
      DEFAULT_NOTIFICATION_PREFERENCES.previewChannelEnabled,
    ),
    quietHoursEnabled: readBoolean(
      'quietHoursEnabled',
      DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnabled,
    ),
    quietHoursFrom: readTime('quietHoursFrom', DEFAULT_NOTIFICATION_PREFERENCES.quietHoursFrom),
    quietHoursTo: readTime('quietHoursTo', DEFAULT_NOTIFICATION_PREFERENCES.quietHoursTo),
  }
}

export function saveSaplingNotificationPreferences(
  preferences: SaplingNotificationPreferences,
) {
  for (const [key, value] of Object.entries(preferences)) {
    writeValue(key as keyof SaplingNotificationPreferences, value)
  }

  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<SaplingNotificationPreferences>(
      SAPLING_NOTIFICATION_PREFERENCES_UPDATED_EVENT,
      {
        detail: { ...preferences },
      },
    ),
  )
}

export function isInSaplingNotificationQuietHours(
  preferences: SaplingNotificationPreferences,
  date = new Date(),
): boolean {
  if (!preferences.quietHoursEnabled) {
    return false
  }

  const currentMinutes = date.getHours() * 60 + date.getMinutes()
  const fromMinutes = parseTimeToMinutes(preferences.quietHoursFrom)
  const toMinutes = parseTimeToMinutes(preferences.quietHoursTo)

  if (fromMinutes === toMinutes) {
    return true
  }

  if (fromMinutes < toMinutes) {
    return currentMinutes >= fromMinutes && currentMinutes < toMinutes
  }

  return currentMinutes >= fromMinutes || currentMinutes < toMinutes
}

function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map((part) => Number(part))

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0
  }

  return Math.max(0, Math.min(23, hours)) * 60 + Math.max(0, Math.min(59, minutes))
}
