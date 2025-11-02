import { i18n } from '@/i18n';
import { ref, onMounted } from 'vue';
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader';
import axios from 'axios';
import { BACKEND_URL } from '@/constants/project.constants';

export function useSaplingChangePassword(emit: (event: 'close') => void) {
  // State
  const newPassword = ref("");
  const confirmPassword = ref("");
  const { translationService, isLoading, loadTranslations } = useTranslationLoader('login');
  const messages = ref<string[]>([]);

  // Lifecycle
  onMounted(() => {
    loadTranslations();
  });

  // Password Change
  async function handlePasswordChange() {
    try {
      await axios.post(BACKEND_URL + 'current/changePassword', {
        newPassword: newPassword.value,
        confirmPassword: confirmPassword.value
      });
      window.location.href = '/';
    } catch (error) {
      console.error('Password change failed:', error);
      if (axios.isAxiosError(error)) {
        messages.value.push(i18n.global.t(error.response?.data.message || 'login.changePasswordError'));
      }
    }
  }

  // Dialog
  function closeDialog() {
    emit('close');
  }

  return {
    newPassword,
    confirmPassword,
    isLoading,
    messages,
    translationService,
    handlePasswordChange,
    closeDialog,
  };
}
