import { ref, onMounted, watch } from 'vue';
import ApiService from '@/services/api.service';
import { i18n } from '@/i18n';
import TranslationService from '@/services/translation.service';
import CookieService from '@/services/cookie.service';
import type { EntityTemplate } from '@/entity/structure';

export function useEntityTable(entityName: string, templateName = entityName) {
  const isLoading = ref(true);
  const items = ref<unknown[]>([]);
  const templates = ref<EntityTemplate[]>([]);
  const search = ref('');
  const headers = ref<{ key: string; title: string; type: string }[]>([]);
  const page = ref(1);
  const itemsPerPage = ref(25);
  const totalItems = ref(0);

  function getTranslationService() {
    return new TranslationService(CookieService.get('language'));
  }

  const loadData = async () => {
    isLoading.value = true;
    const translationService = getTranslationService();
    await translationService.prepare(entityName);

    // Filter für MikroORM where-Syntax
    const filter = search.value
      ? { $or: templates.value.map(t => ({ [t.name]: { $like: `%${search.value}%` } })) }
      : {};

    const result = await ApiService.find(entityName, page.value, itemsPerPage.value, filter);
    items.value = result.data;
    totalItems.value = result.meta.total;
    isLoading.value = false;
  };

  const loadTemplates = async () => {
    templates.value = await ApiService.findAll<EntityTemplate[]>(`${templateName}/template`);
    headers.value = templates.value.map((template: EntityTemplate) => ({
      key: template.name,
      title: i18n.global.t(template.name),
      type: template.type.toLocaleLowerCase()
    }));
  };

  onMounted(async () => {
    await loadTemplates();
    await loadData();
  });

  watch(
    () => i18n.global.locale.value,
    async () => {
      await loadTemplates();
      await loadData();
    }
  );

  watch([search, page, itemsPerPage], loadData);

  return {
    isLoading,
    items,
    templates,
    search,
    headers,
    page,
    itemsPerPage,
    totalItems,
    loadData
  };
}