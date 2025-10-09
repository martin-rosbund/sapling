import { ref, onMounted, watch } from 'vue';
import ApiService from '@/services/api.service';
import { i18n } from '@/i18n';
import TranslationService from '@/services/translation.service';
import CookieService from '@/services/cookie.service';

export function useEntityTable(entityName: string, templateName = entityName) {
  const isLoading = ref(true);
  const items = ref<unknown[]>([]);
  const templates = ref([]);
  const search = ref('');
  const headers = ref<{ key: string; title: string }[]>([]);

  // Helper to (re-)create the translation service with the current language
  function getTranslationService() {
    return new TranslationService(CookieService.get('language'));
  }

  const loadData = async () => {
    isLoading.value = true;
    const translationService = getTranslationService();
    await translationService.prepare(entityName);
    items.value = (await ApiService.find(entityName)).data;
    templates.value = (await ApiService.findAll(`${templateName}/template`));
    headers.value = templates.value.map((template: any) => ({
      key: template.name,
      title: i18n.global.t(template.name)
    }));
    isLoading.value = false;
  };

  onMounted(loadData);

  watch(
    () => i18n.global.locale.value,
    async () => {
      await loadData();
    }
  );

  return { isLoading, items, templates, search, headers };
}