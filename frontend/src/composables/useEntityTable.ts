import { ref, onMounted, watch, type Ref } from 'vue';
import ApiGenericService from '@/services/api.generic.service';
import ApiService from '@/services/api.service';
import { i18n } from '@/i18n';
import TranslationService from '@/services/translation.service';
import CookieService from '@/services/cookie.service';
import type { EntityTemplate } from '@/entity/structure';
import type { EntityItem } from '@/entity/entity';
import { DEFAULT_PAGE_SIZE } from '@/components/entity/tableConstants';

/**
 * Type for sorting items in the table.
 */
type SortItem = { key: string; order?: 'asc' | 'desc' };

/**
 * Composable for managing entity table state, data, and translations.
 * Handles loading, searching, sorting, and pagination for entity tables.
 * @param entityNameRef - Ref to the entity name
 */
export function useEntityTable(entityNameRef: Ref<string>) {
  // Loading state for the table
  const isLoading = ref(true);
  // Data items for the table
  const items = ref<unknown[]>([]);
  // Template definitions for the entity
  const templates = ref<EntityTemplate[]>([]);
  // Search query
  const search = ref('');
  // Table headers (generated from templates)
  const headers = ref<{ key: string; title: string; type: string, kind: string | null }[]>([]);
  // Pagination state
  const page = ref(1);
  const itemsPerPage = ref(DEFAULT_PAGE_SIZE);
  const totalItems = ref(0);
  // Sorting state
  const sortBy = ref<SortItem[]>([]);
  const entity = ref<EntityItem | null>(null);

  /**
   * Load translations for the current entity using the TranslationService.
   * Sets loading state while fetching.
   */
  const loadTranslation = async () => {
    const translationService = new TranslationService(CookieService.get('language'));
    await translationService.prepare(entityNameRef.value, 'global');
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
    sortBy.value.forEach(sort => {
      orderBy[sort.key] = sort.order === 'desc' ? 'DESC' : 'ASC';
    });

    // Fetch data from API
    const result = await ApiGenericService.find(entityNameRef.value, filter, orderBy, page.value, itemsPerPage.value);
    items.value = result.data;
    totalItems.value = result.meta.total;
  };

  /**
   * Load template definitions for the entity and generate table headers.
   */
  const loadTemplates = async () => {
    templates.value = await ApiService.findAll<EntityTemplate[]>(`template/${entityNameRef.value}`);
    headers.value = templates.value.map((template: EntityTemplate) => ({
      ...template,
      key: template.name,
      title: i18n.global.t(`${entityNameRef.value}.${template.name}`),
      type: template.type.toLocaleLowerCase(),
      kind: template.kind?.toLocaleLowerCase() ?? null
    }));
  };

  /**
   * Load entity definition.
   */
  const loadEntity = async () => {
    entity.value = (await ApiGenericService.find<EntityItem>(`entity`, { handle: entityNameRef.value }, {}, 1, 1)).data[0] || null;
  };

  /**
   * Reload all data: translations, templates, and table data.
   */
  const reloadAll = async () => {
    isLoading.value = true;
    await loadEntity();
    await loadTranslation();
    await loadTemplates();
    await loadData();
    isLoading.value = false;
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
  watch([entityNameRef], reloadAll);

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
    entity,
    loadData
  };
}