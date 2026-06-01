export interface SaplingAiPreferences {
  chatProviderHandle: string | null
  chatModelHandle: string | null
  transcriptionProviderHandle: string | null
  transcriptionModelHandle: string | null
  speechProviderHandle: string | null
  speechModelHandle: string | null
}

export const SAPLING_AI_PREFERENCES_UPDATED_EVENT = 'sapling:ai-preferences-updated'

const STORAGE_PREFIX = 'sapling.aiPreference.'

const KEYS: Record<keyof SaplingAiPreferences, string> = {
  chatProviderHandle: `${STORAGE_PREFIX}chatProviderHandle`,
  chatModelHandle: `${STORAGE_PREFIX}chatModelHandle`,
  transcriptionProviderHandle: `${STORAGE_PREFIX}transcriptionProviderHandle`,
  transcriptionModelHandle: `${STORAGE_PREFIX}transcriptionModelHandle`,
  speechProviderHandle: `${STORAGE_PREFIX}speechProviderHandle`,
  speechModelHandle: `${STORAGE_PREFIX}speechModelHandle`,
}

function readValue(key: keyof SaplingAiPreferences): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const value = window.localStorage.getItem(KEYS[key])?.trim()
  return value || null
}

function writeValue(key: keyof SaplingAiPreferences, value: string | null) {
  if (typeof window === 'undefined') {
    return
  }

  if (!value) {
    window.localStorage.removeItem(KEYS[key])
    return
  }

  window.localStorage.setItem(KEYS[key], value)
}

export function loadSaplingAiPreferences(): SaplingAiPreferences {
  return {
    chatProviderHandle: readValue('chatProviderHandle'),
    chatModelHandle: readValue('chatModelHandle'),
    transcriptionProviderHandle: readValue('transcriptionProviderHandle'),
    transcriptionModelHandle: readValue('transcriptionModelHandle'),
    speechProviderHandle: readValue('speechProviderHandle'),
    speechModelHandle: readValue('speechModelHandle'),
  }
}

export function saveSaplingAiPreferences(preferences: SaplingAiPreferences) {
  writeValue('chatProviderHandle', preferences.chatProviderHandle)
  writeValue('chatModelHandle', preferences.chatModelHandle)
  writeValue('transcriptionProviderHandle', preferences.transcriptionProviderHandle)
  writeValue('transcriptionModelHandle', preferences.transcriptionModelHandle)
  writeValue('speechProviderHandle', preferences.speechProviderHandle)
  writeValue('speechModelHandle', preferences.speechModelHandle)

  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<SaplingAiPreferences>(SAPLING_AI_PREFERENCES_UPDATED_EVENT, {
      detail: { ...preferences },
    }),
  )
}
