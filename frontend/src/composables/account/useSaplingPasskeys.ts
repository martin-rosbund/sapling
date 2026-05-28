import { computed, onMounted, ref } from 'vue'
import axios, { AxiosError } from 'axios'
import {
  browserSupportsWebAuthn,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from '@simplewebauthn/browser'
import { buildApiUrl } from '@/services/api.client'
import { i18n } from '@/i18n'

export interface PasskeyItem {
  handle: number
  label: string
  transports?: string[]
  credentialDeviceType?: string
  credentialBackedUp: boolean
  lastUsedAt?: string | Date | null
  createdAt: string | Date
}

type PasskeyRegistrationOptionsResponse = {
  options: PublicKeyCredentialCreationOptionsJSON
}

export function useSaplingPasskeys() {
  const passkeys = ref<PasskeyItem[]>([])
  const isLoading = ref(false)
  const isRegistering = ref(false)
  const deletingHandle = ref<number | null>(null)
  const errorMessage = ref('')
  const newPasskeyLabel = ref(defaultPasskeyLabel())
  const isSupported = computed(() => browserSupportsWebAuthn())

  onMounted(() => {
    void loadPasskeys()
  })

  async function loadPasskeys(): Promise<void> {
    isLoading.value = true
    errorMessage.value = ''

    try {
      const response = await axios.get<PasskeyItem[]>(buildApiUrl('auth/passkey'))
      passkeys.value = response.data
    } catch (error) {
      errorMessage.value = resolvePasskeyError(error, 'login.passkeyLoadFailed')
    } finally {
      isLoading.value = false
    }
  }

  async function registerPasskey(): Promise<void> {
    if (!isSupported.value) {
      errorMessage.value = i18n.global.t('login.passkeyUnsupported')
      return
    }

    isRegistering.value = true
    errorMessage.value = ''

    try {
      const label = normalizeLabel(newPasskeyLabel.value)
      const optionsResponse = await axios.post<PasskeyRegistrationOptionsResponse>(
        buildApiUrl('auth/passkey/register/options'),
        { label },
      )
      const registrationResponse = await startRegistration({
        optionsJSON: optionsResponse.data.options,
      })
      const verifyResponse = await axios.post<PasskeyItem>(
        buildApiUrl('auth/passkey/register/verify'),
        {
          response: registrationResponse,
          label,
        },
      )

      passkeys.value = [
        verifyResponse.data,
        ...passkeys.value.filter((passkey) => passkey.handle !== verifyResponse.data.handle),
      ]
      newPasskeyLabel.value = defaultPasskeyLabel()
    } catch (error) {
      errorMessage.value = resolvePasskeyError(error, 'login.passkeyRegistrationFailed')
    } finally {
      isRegistering.value = false
    }
  }

  async function deletePasskey(passkey: PasskeyItem): Promise<void> {
    if (!passkey.handle) {
      return
    }

    deletingHandle.value = passkey.handle
    errorMessage.value = ''

    try {
      await axios.delete(buildApiUrl(`auth/passkey/${passkey.handle}`))
      passkeys.value = passkeys.value.filter((item) => item.handle !== passkey.handle)
    } catch (error) {
      errorMessage.value = resolvePasskeyError(error, 'login.passkeyDeleteFailed')
    } finally {
      deletingHandle.value = null
    }
  }

  function formatPasskeyDate(value?: string | Date | null): string {
    if (!value) {
      return i18n.global.t('global.notAvailable')
    }

    return new Date(value).toLocaleString()
  }

  return {
    passkeys,
    isLoading,
    isRegistering,
    deletingHandle,
    errorMessage,
    newPasskeyLabel,
    isSupported,
    loadPasskeys,
    registerPasskey,
    deletePasskey,
    formatPasskeyDate,
  }
}

function defaultPasskeyLabel(): string {
  return i18n.global.t('login.passkeyDefaultLabel')
}

function normalizeLabel(value: string): string {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : defaultPasskeyLabel()
}

function resolvePasskeyError(error: unknown, fallbackKey: string): string {
  const message = getAxiosMessage(error)
  const key = message ?? fallbackKey
  return i18n.global.te(key) ? i18n.global.t(key) : i18n.global.t(fallbackKey)
}

function getAxiosMessage(error: unknown): string | null {
  if (!(error instanceof AxiosError)) {
    return null
  }

  const data = error.response?.data
  if (
    typeof data === 'object' &&
    data !== null &&
    'message' in data &&
    typeof data.message === 'string'
  ) {
    return data.message
  }

  if (typeof data === 'string') {
    return data
  }

  return null
}
