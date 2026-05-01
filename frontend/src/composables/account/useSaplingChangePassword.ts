import { computed, ref } from 'vue'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import axios, { AxiosError } from 'axios'
import { BACKEND_URL } from '@/constants/project.constants'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import { useI18n } from 'vue-i18n'

interface UseSaplingChangePasswordOptions {
  close: () => void
  onCancel?: () => void
  onSuccess?: () => void
}

/**
 * Encapsulates the password-change dialog state, loading state and submit handling.
 */
export function useSaplingChangePassword(options: UseSaplingChangePasswordOptions) {
  //#region State
  const newPassword = ref('')
  const confirmPassword = ref('')
  const { t, te } = useI18n()
  const { isLoading: isTranslationLoading } = useTranslationLoader('global', 'login')
  const isSubmitting = ref(false)
  const isLoading = computed(() => isTranslationLoading.value || isSubmitting.value)
  const { pushMessage } = useSaplingMessageCenter()
  //#endregion

  //#region Methods
  /**
   * Resets the form so the dialog always reopens in a clean state.
   */
  function resetForm() {
    newPassword.value = ''
    confirmPassword.value = ''
  }

  /**
   * Submits the password change and only closes the dialog after a successful backend response.
   */
  async function handlePasswordChange() {
    isSubmitting.value = true

    try {
      await axios.post(BACKEND_URL + 'current/changePassword', {
        newPassword: newPassword.value,
        confirmPassword: confirmPassword.value,
      })

      resetForm()
      pushMessage(
        'success',
        translateOrFallback(t, te, 'login.passwordChanged', 'Passwort aktualisiert'),
        translateOrFallback(
          t,
          te,
          'login.passwordChangedDescription',
          'Das Passwort wurde erfolgreich aktualisiert.',
        ),
        'login',
      )
      options.onSuccess?.()
      options.close()
    } catch (error: unknown) {
      pushMessage('error', resolvePasswordChangeMessage(error), '', 'login')
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * Closes the dialog without mutating application state outside the dialog contract.
   */
  function closeDialog() {
    resetForm()
    options.onCancel?.()
    options.close()
  }

  /**
   * Maps backend failures to a user-facing translation key.
   */
  function resolvePasswordChangeMessage(error: unknown): string {
    if (error instanceof AxiosError) {
      const responseData = error.response?.data
      if (typeof responseData === 'string') {
        return responseData
      }

      if (
        typeof responseData === 'object' &&
        responseData !== null &&
        'message' in responseData &&
        typeof responseData.message === 'string'
      ) {
        return responseData.message
      }
    }

    return 'login.passwordChangeFailed'
  }
  //#endregion

  //#region Return
  return {
    newPassword,
    confirmPassword,
    isLoading,
    handlePasswordChange,
    closeDialog,
  }
  //#endregion
}

function translateOrFallback(
  t: ReturnType<typeof useI18n>['t'],
  te: ReturnType<typeof useI18n>['te'],
  key: string,
  fallback: string,
) {
  return te(key) ? t(key) : fallback
}
