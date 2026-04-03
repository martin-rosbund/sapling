import { computed, ref } from 'vue';
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader';
import axios, { AxiosError } from 'axios';
import { BACKEND_URL } from '@/constants/project.constants';
import { i18n } from '@/i18n';

interface UseSaplingChangePasswordOptions {
  close: () => void;
  onCancel?: () => void;
  onSuccess?: () => void;
}

/**
 * Encapsulates the password-change dialog state, loading state and submit handling.
 */
export function useSaplingChangePassword(options: UseSaplingChangePasswordOptions) {
  //#region State
  const newPassword = ref('');
  const confirmPassword = ref('');
  const { isLoading: isTranslationLoading } = useTranslationLoader('global', 'login');
  const isSubmitting = ref(false);
  const isLoading = computed(() => isTranslationLoading.value || isSubmitting.value);
  const messages = ref<string[]>([]);
  //#endregion

  //#region Methods
  /**
   * Resets the form so the dialog always reopens in a clean state.
   */
  function resetForm() {
    newPassword.value = '';
    confirmPassword.value = '';
    messages.value = [];
  }

  /**
   * Submits the password change and only closes the dialog after a successful backend response.
   */
  async function handlePasswordChange() {
    messages.value = [];
    isSubmitting.value = true;

    try {
      await axios.post(BACKEND_URL + 'current/changePassword', {
        newPassword: newPassword.value,
        confirmPassword: confirmPassword.value,
      });

      resetForm();
      options.onSuccess?.();
      options.close();
    } catch (error: unknown) {
      messages.value.push(resolvePasswordChangeMessage(error));
    } finally {
      isSubmitting.value = false;
    }
  }

  /**
   * Closes the dialog without mutating application state outside the dialog contract.
   */
  function closeDialog() {
    resetForm();
    options.onCancel?.();
    options.close();
  }

  /**
   * Maps backend failures to a user-facing translation key.
   */
  function resolvePasswordChangeMessage(error: unknown): string {
    if (error instanceof AxiosError) {
      const responseData = error.response?.data;
      if (typeof responseData === 'string') {
        return i18n.global.t(responseData);
      }

      if (
        typeof responseData === 'object'
        && responseData !== null
        && 'message' in responseData
        && typeof responseData.message === 'string'
      ) {
        return i18n.global.t(responseData.message);
      }
    }

    return i18n.global.t('login.unknownError');
  }
  //#endregion

  //#region Return
  return {
    newPassword,
    confirmPassword,
    isLoading,
    messages,
    handlePasswordChange,
    closeDialog,
  };
  //#endregion
}
