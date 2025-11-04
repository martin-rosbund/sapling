// Importing required modules and types
import { ref, watch, type Ref } from 'vue';
import ApiGenericService from '@/services/api.generic.service';
import { i18n } from '@/i18n';
import type { EntityTemplate } from '@/entity/structure';
import { DEFAULT_PAGE_SIZE_MEDIUM, ENTITY_SYSTEM_COLUMNS } from '@/constants/project.constants';
import { useGenericLoader } from '../generic/useGenericLoader';

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
export function useSaplingEntity(
  entityNameRef: Ref<string>,
  itemsOverride?: Ref<unknown[]> | null,
  parentFilter?: Ref<Record<string, unknown>> | null
) {
  // Data items for the table
  const items = itemsOverride ?? ref<unknown[]>([]);

  // Template definitions for the entity
  //const templates = ref<EntityTemplate[]>([]);

  // Search query
  const search = ref('');

  // Table headers (generated from templates)
  const headers = ref<SaplingEntityHeader[]>([]);

  // Pagination state
  const page = ref(1);
  const itemsPerPage = ref(DEFAULT_PAGE_SIZE_MEDIUM);
  const totalItems = ref(0);

  // Sort state
  const sortBy = ref<SortItem[]>([]);

  // Current entity
  const { entity, entityPermission, entityTemplates, isLoading, loadGeneric } = useGenericLoader(entityNameRef.value, 'global');

  // Get filter from URL query parameter if present
  function getUrlFilterParam() {
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
      ? { $or: entityTemplates.value.filter(x => !x.isReference).map(t => ({ [t.name]: { $like: `%${search.value}%` } })) }
      : {};

    // Merge parentFilter if present
    if (parentFilter && parentFilter.value && Object.keys(parentFilter.value).length > 0) {
      filter = { ...filter, ...parentFilter.value };
    }

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

  /**
   * Generates table headers from templates and translations.
   */
  const generateHeaders = () => {
    headers.value = entityTemplates.value.filter(x => !ENTITY_SYSTEM_COLUMNS.includes(x.name)).map((template: EntityTemplate) => ({
      ...template,
      key: template.name,
      title: i18n.global.t(`${entityNameRef.value}.${template.name}`)
    }));
  };

  // Reload translations and templates when locale changes
  watch(
    () => isLoading.value,
    () => {
      if(isLoading.value) return;
      loadData();
      generateHeaders();
    }
  );

  // Reload data when search, page, itemsPerPage, or sortBy changes
  watch([search, page, itemsPerPage, sortBy], loadData);

  // Reload everything when entity or template changes
  watch([entityNameRef], () => loadGeneric(entityNameRef.value, 'global'));
  
  // Return reactive state and methods for use in components
  return {
    isLoading,
    items,
    entityTemplates,
    search,
    headers,
    page,
    itemsPerPage,
    totalItems,
    sortBy,
    entity,
    entityPermission,
    loadData
  };
}