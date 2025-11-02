import { ref, onMounted, watch } from 'vue';
import axios from 'axios';
import TranslationService from '@/services/translation.service';
import { i18n } from '@/i18n';
import { BACKEND_URL } from '@/constants/project.constants';

export function useSaplingChangePassword(emit: (event: 'close') => void) {
  // State
  const newPassword = ref("");
  const confirmPassword = ref("");
  const isLoading = ref(true);
  const messages = ref<string[]>([]);
  const translationService = ref(new TranslationService());

  // Lifecycle
  onMounted(async () => {
    await translationService.value.prepare('login');
    isLoading.value = false;
  });

  watch(() => i18n.global.locale.value, async () => {
    isLoading.value = true;
    translationService.value = new TranslationService();
    await translationService.value.prepare('login');
    isLoading.value = false;
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
