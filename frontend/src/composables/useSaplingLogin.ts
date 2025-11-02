import { ref, onMounted, watch } from 'vue';
import axios from 'axios';
import TranslationService from '@/services/translation.service';
import { i18n } from '@/i18n';
import { BACKEND_URL, DEBUG_PASSWORD, DEBUG_USERNAME } from '@/constants/project.constants';

export function useSaplingLogin() {
  const email = ref(DEBUG_USERNAME);
  const password = ref(DEBUG_PASSWORD);
  const isLoading = ref(true);
  const messages = ref<string[]>([]);
  const translationService = ref(new TranslationService());

  onMounted(async () => {
    await translationService.value.prepare('login');
    isLoading.value = false;
  });

  watch(
    () => i18n.global.locale.value,
    async () => {
      isLoading.value = true;
      translationService.value = new TranslationService();
      await translationService.value.prepare('login');
      isLoading.value = false;
    }
  );

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
