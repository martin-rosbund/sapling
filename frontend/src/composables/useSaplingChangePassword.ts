import { i18n } from '@/i18n';
import { ref, onMounted } from 'vue';
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader';
import axios from 'axios';
import { BACKEND_URL } from '@/constants/project.constants';

export function useSaplingChangePassword(emit: (event: 'close') => void) {
  //#region State
  // State variables to hold the new password and confirmation password entered by the user
  const newPassword = ref("");
  const confirmPassword = ref("");

  // Translation loader for fetching localized strings for the 'login' namespace
  const { translationService, isLoading, loadTranslations } = useTranslationLoader('login');

  // Array to store error or success messages to be displayed to the user
  const messages = ref<string[]>([]);
  //#endregion

  //#region Lifecycle
  // Lifecycle hook to load translations when the component is mounted
  onMounted(() => {
    loadTranslations();
  });
  //#endregion

  //#region Methods
  // Function to handle the password change process
  async function handlePasswordChange() {
    try {
      // Send a POST request to the backend to change the password
      await axios.post(BACKEND_URL + 'current/changePassword', {
        newPassword: newPassword.value,
        confirmPassword: confirmPassword.value
      });

      // Emit the 'close' event to notify the parent component to close the dialog
      emit('close');
    } catch (error) {
      console.error('Password change failed:', error);

      // Handle Axios-specific errors and display appropriate messages
      if (axios.isAxiosError(error)) {
        messages.value.push(i18n.global.t(error.response?.data.message || 'login.changePasswordError'));
      }
    }
  }

  // Function to close the dialog by emitting the 'close' event
  function closeDialog() {
    emit('close');
  }
  //#endregion

  //#region Return
  // Return the state variables and functions to be used in the component
  return {
    newPassword,
    confirmPassword,
    isLoading,
    messages,
    translationService,
    handlePasswordChange,
    closeDialog,
  };
  //#endregion
}
