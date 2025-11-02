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

  onMounted(() => {
    loadTranslations();
  });

  async function handleLogin() {
    try {
      await axios.post(BACKEND_URL + 'auth/local/login', {
        loginName: email.value,
        loginPassword: password.value,
      });
      window.location.href = '/';
    } catch {
       messages.value.push(i18n.global.t('login.wrongCredentials'));
    }
  }

  function handleAzure() {
    window.location.href = BACKEND_URL + 'auth/azure/login';
  }

  return {
    email,
    password,
    isLoading,
    messages,
    translationService,
    handleLogin,
    handleAzure,
  };
}
