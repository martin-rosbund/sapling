import { ref, onMounted, watch } from 'vue';
import TranslationService from '@/services/translation.service';
import { i18n } from '@/i18n';

export function useTranslationLoader(...namespaces: string[]) {
  const translationService = ref(new TranslationService());
  const isLoading = ref(true);

  async function loadTranslations() {
    isLoading.value = true;
    await translationService.value.prepare(...namespaces);
    isLoading.value = false;
  }

  onMounted(loadTranslations);
  watch(() => i18n.global.locale.value, loadTranslations);

  return { translationService, isLoading, loadTranslations };
}