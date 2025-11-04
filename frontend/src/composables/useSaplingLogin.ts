import { i18n } from '@/i18n';
import { ref, onMounted } from 'vue';
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader';
import axios from 'axios';
import { BACKEND_URL, DEBUG_PASSWORD, DEBUG_USERNAME } from '@/constants/project.constants';

export function useSaplingLogin() {
  const email = ref(DEBUG_USERNAME);
  const password = ref(DEBUG_PASSWORD);
  const { translationService, isLoading, loadTranslations } = useTranslationLoader('login');
  const messages = ref<string[]>([]);
  const showPasswordChange = ref(false);
  const requirePasswordChange = ref(false);
  const personData = ref<any>(null);

  async function handleLogin() {
    try {
      await axios.post(BACKEND_URL + 'auth/local/login', {
        loginName: email.value,
        loginPassword: password.value,
      });
      // Nach Login: Person-Daten laden
      const response = await axios.get(BACKEND_URL + 'current/person');
      personData.value = response.data;
      if (personData.value?.requirePasswordChange) {
        requirePasswordChange.value = true;
        showPasswordChange.value = true;
        // Keine Weiterleitung, Dialog anzeigen
      } else {
        window.location.href = '/';
      }
    } catch {
      messages.value.push(i18n.global.t('login.wrongCredentials'));
    }
  }

  function handlePasswordChangeSuccess() {
    showPasswordChange.value = false;
    window.location.href = '/';
  }

  function handleAzure() {
    window.location.href = BACKEND_URL + 'auth/azure/login';
  }

  function handleGoogle() {
    window.location.href = BACKEND_URL + 'auth/google/login';
  }

  return {
    email,
    password,
    isLoading,
    messages,
    translationService,
    handleLogin,
    handleAzure,
    handleGoogle,
    showPasswordChange,
    requirePasswordChange,
    handlePasswordChangeSuccess
  };
}
