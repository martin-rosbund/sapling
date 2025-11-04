
import { ref, onMounted, watch } from 'vue';
import TranslationService from '@/services/translation.service';
import { i18n } from '@/i18n';

// Cache für geladene Übersetzungen: Map<key, Promise<any>>
const translationLoadCache = new Map<string, Promise<any>>();

function getCacheKey(namespaces: string[], locale: string) {
  return namespaces.sort().join(',') + '|' + locale;
}

export function useTranslationLoader(...namespaces: string[]) {
  const translationService = ref(new TranslationService());
  const isLoading = ref(true);

  async function loadTranslations() {
    const locale = i18n.global.locale.value;
    const cacheKey = getCacheKey(namespaces, locale);
    isLoading.value = true;
    let promise = translationLoadCache.get(cacheKey);
    if (!promise) {
      promise = translationService.value.prepare(...namespaces);
      translationLoadCache.set(cacheKey, promise);
    }
    await promise;
    isLoading.value = false;
  }

  // Nur beim Mounten laden, Watcher nur auslösen wenn sich die Sprache wirklich ändert
  let lastLocale = i18n.global.locale.value;
  onMounted(loadTranslations);
  watch(
    () => i18n.global.locale.value,
    (newLocale) => {
      if (newLocale !== lastLocale) {
        lastLocale = newLocale;
        loadTranslations();
      }
    }
  );

  return { translationService, isLoading, loadTranslations };
}