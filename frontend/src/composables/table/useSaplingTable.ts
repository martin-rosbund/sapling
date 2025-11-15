// #region Imports
import { onMounted, ref, watch, type Ref } from 'vue';
import ApiGenericService from '@/services/api.generic.service';
import { i18n } from '@/i18n';
import type { EntityTemplate, SaplingEntityHeaderItem, SortItem, AccumulatedPermission } from '@/entity/structure';
import type { EntityItem } from '@/entity/entity';
import { DEFAULT_PAGE_SIZE_MEDIUM, ENTITY_SYSTEM_COLUMNS } from '@/constants/project.constants';
import { useGenericStore } from '@/stores/genericStore';
// #endregion

// #region useSaplingTable Composable
/**
 * Composable for managing entity table state, data, and translations.
 * Handles loading, searching, sorting, and pagination for entity tables.
 * @param entityName - Ref to the entity name
 * @param parentFilter - Optional parent filter for related data
 */
export function useSaplingTable(
  entityName: Ref<string>,
  key: Ref<string>,
  parentFilter?: Ref<Record<string, unknown>> | null
) {
  // #region State
  const items = ref<unknown[]>([]); // Data items for the table
  const search = ref(''); // Search query
  const headers = ref<SaplingEntityHeaderItem[]>([]); // Table headers (generated from templates)
  const page = ref(1); // Pagination state
  const itemsPerPage = ref(DEFAULT_PAGE_SIZE_MEDIUM);
  const totalItems = ref(0);
  const sortBy = ref<SortItem[]>([]); // Sort state
  // #endregion

  // #region Entity Loader
  const genericLoader = useGenericStore();

  // Zugriff auf den isolierten State für diesen Key
  function getStoreState() {
    const state = genericLoader.entityStates.get(key.value);
    if (!state) {
      // Fallback: leere Werte, damit keine Fehler entstehen
      return {
        entity: null,
        entityPermission: null,
        entityTranslation: undefined,
        entityTemplates: [],
        isLoading: true,
        currentEntityName: '',
        currentNamespaces: [],
      };
    }
    return state;
  }

  // Proxy-Refs für die Entity-spezifischen States
  const isLoading = ref(true);
  const entity = ref<EntityItem | null>(null);
  const entityPermission = ref<AccumulatedPermission | null>(null);
  const entityTemplates = ref<EntityTemplate[]>([]);

  // Initiales Laden
  onMounted(() => {
    genericLoader.loadGeneric(key.value, entityName.value, 'global');
  });

  // #region Utility Functions
  function getUrlFilterParam() {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const filterParam = params.get('filter');
      if (filterParam) {
        try {
          return JSON.parse(filterParam);
        } catch {
          return filterParam;
        }
      }
    }
    return null;
  }
  // #endregion

  // #region Data Loading
  const loadData = async () => {
    const storeState = getStoreState();
    // Build filter for search
    let filter = search.value
      ? { $or: storeState.entityTemplates.filter((x: EntityTemplate) => !x.isReference).map((t: EntityTemplate) => ({ [t.name]: { $like: `%${search.value}%` } })) }
      : {};

    if (parentFilter && parentFilter.value && Object.keys(parentFilter.value).length > 0) {
      filter = { ...filter, ...parentFilter.value };
    }

    const urlFilter = getUrlFilterParam();
    if (urlFilter) {
      filter = { ...filter, ...urlFilter };
    }

    const orderBy: Record<string, string> = {};
    sortBy.value.forEach(sort => {
      orderBy[sort.key] = sort.order === 'desc' ? 'DESC' : 'ASC';
    });

    const result = await ApiGenericService.find(entityName.value, { filter, orderBy, page: page.value, limit: itemsPerPage.value, relations: ['m:1'] });
    items.value = result.data;
    totalItems.value = result.meta.total;
  };
  // #endregion

  // #region Header Generation
  const generateHeaders = () => {
    const storeState = getStoreState();
    headers.value = storeState.entityTemplates.filter((x: EntityTemplate) => {
      const template = storeState.entityTemplates.find((t: EntityTemplate) => t.name === x.name);
      return !ENTITY_SYSTEM_COLUMNS.includes(x.name) && !(template && template.isAutoIncrement);
    }).map((template: EntityTemplate) => ({
      ...template,
      key: template.name,
      title: i18n.global.t(`${entityName.value}.${template.name}`)
    }));
  };
  // #endregion

  // #region Watchers
  // Sync local refs mit Store-State
  watch(
    () => {
      const state = genericLoader.entityStates.get(key.value);
      return state ? state.isLoading : undefined;
    },
    (loading) => {
      if (typeof loading === 'undefined') {
        // State noch nicht initialisiert, keine Updates
        isLoading.value = true;
        entity.value = null;
        entityPermission.value = null;
        entityTemplates.value = [];
        return;
      }
      // loading ist ein boolean, isLoading ist ein Ref
      isLoading.value = Boolean(loading);
      if (loading === false) {
        // Update entity-spezifische States
        const storeState = getStoreState();
        entity.value = storeState.entity;
        entityPermission.value = storeState.entityPermission;
        entityTemplates.value = storeState.entityTemplates;
        loadData();
        generateHeaders();
      }
    }
  );

  // Reload data when search, page, itemsPerPage, or sortBy changes
  watch([search, page, itemsPerPage, sortBy], loadData);

  // Reload everything when entity or key changes
  watch([entityName, key], () => genericLoader.loadGeneric(key.value, entityName.value, 'global'));
  // #endregion

  // #region Event Handlers
  function onSearchUpdate(val: string) {
    search.value = val;
    page.value = 1;
  }

  function onPageUpdate(val: number) {
    page.value = val;
  }

  function onItemsPerPageUpdate(val: number) {
    itemsPerPage.value = val;
    page.value = 1;
  }

  function onSortByUpdate(val: unknown) {
    sortBy.value = val as typeof sortBy.value;
  }
  // #endregion

  // #region Return
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
    loadData,
    onSearchUpdate,
    onPageUpdate,
    onItemsPerPageUpdate,
    onSortByUpdate
  };
  // #endregion
}
// #endregion