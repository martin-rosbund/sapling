import { ref, onMounted, watch } from 'vue';
import { i18n } from '@/i18n';
import TranslationService from '@/services/translation.service';

export function useSaplingError() {
  const translationService = ref(new TranslationService());
  const isLoading = ref(true);

  onMounted(async () => {
    isLoading.value = true;
    await translationService.value.prepare('error');
    isLoading.value = false;
  });

  watch(() => i18n.global.locale.value, async () => {
    isLoading.value = true;
    translationService.value = new TranslationService();
    await translationService.value.prepare('error');
    isLoading.value = false;
  });

  return {
    translationService,
    isLoading,
  };
}
