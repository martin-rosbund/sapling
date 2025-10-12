import { ref, onMounted, watch, type Ref } from 'vue';
import ApiService from '@/services/api.service';
import { i18n } from '@/i18n';
import TranslationService from '@/services/translation.service';
import CookieService from '@/services/cookie.service';
import type { EntityTemplate } from '@/entity/structure';
type SortItem = { key: string; order?: 'asc' | 'desc' };

export function useEntityTable(entityNameRef: Ref<string>, templateNameRef?: Ref<string>) {
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
    await translationService.prepare(entityNameRef.value);

    const filter = search.value
      ? { $or: templates.value.map(t => ({ [t.name]: { $like: `%${search.value}%` } })) }
      : {};

    let orderBy: Record<string, any> = {};
    if (sortBy.value.length > 0) {
      sortBy.value.forEach(sort => {
        orderBy[sort.key] = sort.order === 'desc' ? 'DESC' : 'ASC';
      });
    }

    const result = await ApiService.find(entityNameRef.value, filter, orderBy, page.value, itemsPerPage.value);
    items.value = result.data;
    totalItems.value = result.meta.total;
    isLoading.value = false;
  };

  const loadTemplates = async () => {
    templates.value = await ApiService.findAll<EntityTemplate[]>(`${(templateNameRef?.value ?? entityNameRef.value)}/template`);
    headers.value = templates.value.map((template: EntityTemplate) => ({
      key: template.name,
      title: i18n.global.t(template.name),
      type: template.type.toLocaleLowerCase()
    }));
  };

  const reloadAll = async () => {
    await loadTemplates();
    await loadData();
  };

  onMounted(reloadAll);

  watch(
    () => i18n.global.locale.value,
    reloadAll
  );

  watch([search, page, itemsPerPage, sortBy], loadData);

  // Reagiere auf entityName/templateName-Änderung
  watch([entityNameRef, templateNameRef ?? entityNameRef], reloadAll);

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