// Importing required modules and types
import { ref, onMounted, watch, type Ref } from 'vue';
import ApiGenericService from '@/services/api.generic.service';
import ApiService from '@/services/api.service';
import { i18n } from '@/i18n';
import TranslationService from '@/services/translation.service';
import type { AccumulatedPermission, EntityTemplate } from '@/entity/structure';
import type { EntityItem } from '@/entity/entity';
import { DEFAULT_PAGE_SIZE_MEDIUM } from '@/constants/project.constants';
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore';

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
  const templates = ref<EntityTemplate[]>([]);

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
  const entity = ref<EntityItem | null>(null);
  
  // Current user's permissions
  const ownPermission = ref<AccumulatedPermission | null>(null);

  //#region People and Company
  async function setOwnPermissions(){
      const currentPermissionStore = useCurrentPermissionStore();
      await currentPermissionStore.fetchCurrentPermission();
      ownPermission.value = currentPermissionStore.accumulatedPermission?.find(x => x.entityName === entityNameRef.value) || null;
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
    const filter = search.value
      ? { $or: templates.value.filter(x => !x.isReference).map(t => ({ [t.name]: { $like: `%${search.value}%` } })) }
      : {};

    // Build orderBy for sorting
    // EN: Build orderBy for sorting
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
   * Loads template definitions for the entity.
   */
  const loadTemplates = async () => {
    templates.value = await ApiService.findAll<EntityTemplate[]>(`template/${entityNameRef.value}`);
  };

  /**
   * Generates table headers from templates and translations.
   */
  const generateHeaders = () => {
    headers.value = templates.value.map((template: EntityTemplate) => ({
      ...template,
      key: template.name,
      title: i18n.global.t(`${entityNameRef.value}.${template.name}`)
    }));
  };

  /**
   * Loads the entity definition.
   */
  const loadEntity = async () => {
    entity.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { handle: entityNameRef.value }, limit: 1, page: 1 })).data[0] || null;
  };

  /**
   * Reloads all data: translations, templates, and table data.
   */
  const reloadAll = async () => {
    isLoading.value = true;
    await loadEntity();
    await loadTemplates();
    await loadTranslation();
    await setOwnPermissions();
    isLoading.value = false;

    generateHeaders();
    loadData();
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
  // WICHTIG: Im Component KEIN Destructuring von ownPermission verwenden, sondern direkt auf das zurückgegebene Objekt zugreifen (z.B. composable.ownPermission?.allowInsert)
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
    ownPermission,
    loadData
  };
}