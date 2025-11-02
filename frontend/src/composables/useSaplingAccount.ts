import { ref, onMounted, watch } from 'vue';
import { i18n } from '@/i18n';
import TranslationService from '@/services/translation.service';
import axios from 'axios';
import { BACKEND_URL } from '@/constants/project.constants';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';

export function useSaplingAccount() {
  // State
  const translationService = ref(new TranslationService());
  const isLoading = ref(true);
  const showPasswordChange = ref(false);
  const currentPersonStore = useCurrentPersonStore();

  // Lifecycle
  onMounted(async () => {
    await loadTranslations();
    currentPersonStore.fetchCurrentPerson();
  });

  watch(() => i18n.global.locale.value, async () => {
    await loadTranslations();
  });

  // Translations
  async function loadTranslations() {
    isLoading.value = true;
    await translationService.value.prepare('global', 'person', 'login');
    isLoading.value = false;
  }

  // Password
  function changePassword() {
    showPasswordChange.value = true;
  }

  // Age
  function calculateAge(birthDay: Date | string | null): number | null {
    if (!birthDay) return null;
    const birth = new Date(birthDay);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  // Logout
  async function logout() {
    await axios.get(BACKEND_URL + 'auth/logout');
    window.location.href = '/login';
  }

  return {
    translationService,
    isLoading,
    showPasswordChange,
    currentPersonStore,
    loadTranslations,
    changePassword,
    calculateAge,
    logout,
  };
}
