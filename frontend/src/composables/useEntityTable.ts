import { ref, onMounted, watch } from 'vue';
import ApiService from '@/services/api.service';
import { i18n } from '@/i18n';
import TranslationService from '@/services/translation.service';
import CookieService from '@/services/cookie.service';
import type { EntityTemplate } from '@/entity/structure';
type SortItem = { key: string; order?: 'asc' | 'desc' };

export function useEntityTable(entityName: string, templateName = entityName) {
  const isLoading = ref(true);
  const items = ref<unknown[]>([]);
  const templates = ref<EntityTemplate[]>([]);
  const search = ref('');
  const headers = ref<{ key: string; title: string; type: string }[]>([]);
  const page = ref(1);
  const itemsPerPage = ref(25);
  const totalItems = ref(0);

  const sortBy = ref<SortItem[]>([]);

  function getTranslationService() {
    return new TranslationService(CookieService.get('language'));
  }

  const loadData = async () => {
    isLoading.value = true;
    const translationService = getTranslationService();
    await translationService.prepare(entityName);

    const filter = search.value
      ? { $or: templates.value.map(t => ({ [t.name]: { $like: `%${search.value}%` } })) }
      : {};

    let orderBy: Record<string, any> = {};
    if (sortBy.value.length > 0) {
      sortBy.value.forEach(sort => {
        orderBy[sort.key] = sort.order === 'desc' ? 'DESC' : 'ASC';
      });
    }

    const result = await ApiService.find(entityName, page.value, itemsPerPage.value, filter, orderBy);
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
    await loadData();
    await loadTemplates();
  });

  watch(
    () => i18n.global.locale.value,
    async () => {
      await loadData();
      await loadTemplates();
    }
  );

  watch([search, page, itemsPerPage, sortBy], loadData);

  return {
    isLoading,
    items,
    templates,
    search,
    headers,
    page,
    itemsPerPage,
    totalItems,
    sortBy,
    loadData
  };
}