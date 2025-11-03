// Importing required modules and types
import { ref, onMounted, watch, type Ref } from 'vue';
import ApiGenericService from '@/services/api.generic.service';
import { i18n } from '@/i18n';
import TranslationService from '@/services/translation.service';
import type { EntityTemplate } from '@/entity/structure';
import { useTemplateLoader } from '@/composables/generic/useTemplateLoader';
import { usePermissionLoader } from '@/composables/generic/usePermissionLoader';
import { useEntityLoader } from '@/composables/generic/useEntityLoader';
import { DEFAULT_PAGE_SIZE_MEDIUM, ENTITY_SYSTEM_COLUMNS } from '@/constants/project.constants';

/**
 * Type for sorting items in the table.
 */
export type SortItem = { key: string; order?: 'asc' | 'desc' };

// Header type for the entity table
export type SaplingEntityHeader = EntityTemplate & {
  title: string;
  [key: string]: unknown;
};

/**
 * Composable for managing entity table state, data, and translations.
 * Handles loading, searching, sorting, and pagination for entity tables.
 * @param entityNameRef - Ref to the entity name
 */
export function useSaplingEntity(entityNameRef: Ref<string>, itemsOverride?: Ref<unknown[]> | null) {

  // Loading state for the table
  const isLoading = ref(true);

  // Data items for the table
  const items = itemsOverride ?? ref<unknown[]>([]);

  // Template definitions for the entity
  const { templates, isLoading: isTemplateLoading, loadTemplates } = useTemplateLoader(entityNameRef.value);

  // Search query
  const search = ref('');

  // Table headers (generated from templates)
  const headers = ref<SaplingEntityHeader[]>([]);

  // Translation service instance (reactive)
  const translationService = ref(new TranslationService());

  // Pagination state
  const page = ref(1);
  const itemsPerPage = ref(DEFAULT_PAGE_SIZE_MEDIUM);
  const totalItems = ref(0);

  // Sort state
  const sortBy = ref<SortItem[]>([]);

  // Current entity
  const { entity, isLoading: isEntityLoading, loadEntity } = useEntityLoader('entity', { filter: { handle: entityNameRef.value }, limit: 1, page: 1 });

  // Current user's permissions via loader
  const { ownPermission, isLoading: isPermissionLoading, loadPermission } = usePermissionLoader(entityNameRef.value);

  // Get filter from URL query parameter if present
  function getUrlFilterParam(): any {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const filterParam = params.get('filter');
      if (filterParam) {
        try {
          // Try to parse as JSON, fallback to string
          return JSON.parse(filterParam);
        } catch {
          return filterParam;
        }
      }
    }
    return null;
  }

  /**
   * Loads translations for the current entity using the TranslationService.
   * Sets loading state while fetching.
   */
  const loadTranslation = async () => {
    const referenceNames = getUniqueTemplateReferenceNames();
    await translationService.value.prepare(...referenceNames, entityNameRef.value, 'global');
  };

  /**
   * Extracts a list of unique template reference names.
   */
  function getUniqueTemplateReferenceNames(): string[] {
    return Array.from(
      new Set(templates.value.map(template => template.referenceName))
    );
  }

  /**
   * Loads data for the table from the API, applying search, sorting, and pagination.
   */
  const loadData = async () => {
    if (itemsOverride) {
      // Keine API-Requests, nur Items übernehmen
      totalItems.value = items.value.length;
      return;
    }

    // Build filter for search
    let filter = search.value
      ? { $or: templates.value.filter(x => !x.isReference).map(t => ({ [t.name]: { $like: `%${search.value}%` } })) }
      : {};

    // Merge filter from URL query param if present
    const urlFilter = getUrlFilterParam();
    if (urlFilter) {
      // If both filters exist, merge them (simple shallow merge)
      filter = { ...filter, ...urlFilter };
    }

    // Build orderBy for sorting
    const orderBy: Record<string, string> = {};
    sortBy.value.forEach(sort => {
      orderBy[sort.key] = sort.order === 'desc' ? 'DESC' : 'ASC';
    });

    // Fetch data from API
    const result = await ApiGenericService.find(entityNameRef.value, { filter, orderBy, page: page.value, limit: itemsPerPage.value, relations: ['m:1'] });
    items.value = result.data;
    totalItems.value = result.meta.total;
  };

  // Templates werden jetzt über useTemplateLoader geladen

  /**
   * Generates table headers from templates and translations.
   */
  const generateHeaders = () => {
    headers.value = templates.value.filter(x => !ENTITY_SYSTEM_COLUMNS.includes(x.name)).map((template: EntityTemplate) => ({
      ...template,
      key: template.name,
      title: i18n.global.t(`${entityNameRef.value}.${template.name}`)
    }));
  };

  /**
   * Reloads all data: translations, templates, and table data.
   */
  const reloadAll = async () => {
  isLoading.value = true;
  await loadEntity();
  await loadTemplates();
  await loadTranslation();
  await loadPermission();
  generateHeaders();
  loadData();
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
    isEntityLoading,
    items,
    templates,
    isTemplateLoading,
    search,
    headers,
    page,
    itemsPerPage,
    totalItems,
    sortBy,
    entity,
    ownPermission,
    loadData,
    loadEntity
  };
}