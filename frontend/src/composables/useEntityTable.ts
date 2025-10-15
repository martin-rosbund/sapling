import { ref, onMounted, watch, type Ref } from 'vue';
import ApiService from '@/services/api.service';
import { i18n } from '@/i18n';
import TranslationService from '@/services/translation.service';
import CookieService from '@/services/cookie.service';
import type { EntityTemplate } from '@/entity/structure';

// Type for sorting items in the table
type SortItem = { key: string; order?: 'asc' | 'desc' };

/**
 * Composable for managing entity table state, data, and translations.
 * Handles loading, searching, sorting, and pagination for entity tables.
 * @param entityNameRef - Ref to the entity name
 * @param templateNameRef - Optional ref to a template name (for custom templates)
 */
export function useEntityTable(entityNameRef: Ref<string>, templateNameRef?: Ref<string>) {
  // Loading state for the table
  const isLoading = ref(true);
  // Data items for the table
  const items = ref<unknown[]>([]);
  // Template definitions for the entity
  const templates = ref<EntityTemplate[]>([]);
  // Search query
  const search = ref('');
  // Table headers (generated from templates)
  const headers = ref<{ key: string; title: string; type: string }[]>([]);
  // Pagination state
  const page = ref(1);
  const itemsPerPage = ref(25);
  const totalItems = ref(0);
  // Sorting state
  const sortBy = ref<SortItem[]>([]);

  /**
   * Load translations for the current entity using the TranslationService.
   * Sets loading state while fetching.
   */
  const loadTranslation = async () => {
    isLoading.value = true;
    const translationService = new TranslationService(CookieService.get('language'));
    await translationService.prepare(entityNameRef.value, 'global');
    isLoading.value = false;
  };

  /**
   * Load data for the table from the API, applying search, sorting, and pagination.
   */
  const loadData = async () => {
    // Build filter for search
    const filter = search.value
      ? { $or: templates.value.map(t => ({ [t.name]: { $like: `%${search.value}%` } })) }
      : {};

    // Build orderBy for sorting
    const orderBy: Record<string, string> = {};
    if (sortBy.value.length > 0) {
      sortBy.value.forEach(sort => {
        orderBy[sort.key] = sort.order === 'desc' ? 'DESC' : 'ASC';
      });
    }

    // Fetch data from API
    const result = await ApiService.find(`generic/${entityNameRef.value}`, filter, orderBy, page.value, itemsPerPage.value);
    items.value = result.data;
    totalItems.value = result.meta.total;
  };

  /**
   * Load template definitions for the entity and generate table headers.
   */
  const loadTemplates = async () => {
    templates.value = await ApiService.findAll<EntityTemplate[]>(`generic/${(templateNameRef?.value ?? entityNameRef.value)}/template`);
    headers.value = templates.value.map((template: EntityTemplate) => ({
      key: template.name,
      title: i18n.global.t(template.name),
      type: template.type.toLocaleLowerCase()
    }));
  };

  /**
   * Reload all data: translations, templates, and table data.
   */
  const reloadAll = async () => {
    await loadTranslation();
    await loadTemplates();
    await loadData();
  };

  // Initial load on mount
  onMounted(reloadAll);

  // Reload translations and templates when locale changes
  watch(
    () => i18n.global.locale.value,
    reloadAll
  );

  // Reload data when search, page, itemsPerPage, or sortBy changes
  watch([search, page, itemsPerPage, sortBy], loadData);
  // Reload everything when entity or template changes
  watch([entityNameRef, templateNameRef ?? entityNameRef], reloadAll);

  // Return reactive state and methods for use in components
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