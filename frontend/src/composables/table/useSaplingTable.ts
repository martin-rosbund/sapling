// #region Imports
import { computed, onMounted, ref, watch, type Ref } from 'vue';
import ApiGenericService from '@/services/api.generic.service';
import { i18n } from '@/i18n';
import type { EntityTemplate, SaplingTableHeaderItem, SortItem } from '@/entity/structure';
import type { SaplingGenericItem } from '@/entity/entity';
import { DEFAULT_PAGE_SIZE_MEDIUM } from '@/constants/project.constants';
import { useGenericStore } from '@/stores/genericStore';
import { useRoute } from 'vue-router';
// #endregion

// #region useSaplingTable Composable
/**
 * Composable for managing entity table state, data, and translations.
 * Handles loading, searching, sorting, and pagination for entity tables.
 * @param entityHandle - Ref to the entity handle
 * @param itemsPerPageDefaultValue - Optional default items per page
 * @param isUseQueryParameter - Optional flag to use query parameters for filters
 * @returns Object containing table state, data, and event handlers
 */
export function useSaplingTable(
  entityHandle: Ref<string>,
  itemsPerPageDefaultValue?: number,
  isUseQueryParameter?: boolean
) {
  // #region State
  const items = ref<SaplingGenericItem[]>([]); // Data items for the table
  const search = ref(''); // Search query
  const headers = ref<SaplingTableHeaderItem[]>([]); // Table headers (generated from templates)
  const page = ref(1); // Pagination state
  const itemsPerPageDefault = ref<number>(itemsPerPageDefaultValue ?? DEFAULT_PAGE_SIZE_MEDIUM); // Default items per page
  const itemsPerPage = ref(itemsPerPageDefault.value); // Items per page
  const totalItems = ref(0);
  const sortBy = ref<SortItem[]>([]); // Sort state
  const parentFilter = ref<Record<string, unknown>>({});
  const route = useRoute();
  // #endregion

  // #region Entity Loader
  const genericStore = useGenericStore();
  genericStore.loadGeneric(entityHandle.value, 'global');
  const entity = computed(() => genericStore.getState(entityHandle.value).entity);
  const entityPermission = computed(() => genericStore.getState(entityHandle.value).entityPermission);
  const entityTemplates = computed(() => genericStore.getState(entityHandle.value).entityTemplates);
  const isLoading = computed(() => genericStore.getState(entityHandle.value).isLoading);
  // #endregion

  // #region Utility Functions
  function getUrlFilterParam() {
    if (typeof window !== 'undefined' && isUseQueryParameter) {
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
    // Build filter for search
    let filter = search.value
      ? { $or: entityTemplates.value.filter((x) => !x.isReference).map((t) => ({ [t.name]: { $like: `%${search.value}%` } })) }
      : {};

    if (parentFilter.value && Object.keys(parentFilter.value).length > 0) {
      if (Object.keys(filter).length > 0) {
        filter = { $and: [filter, parentFilter.value] };
      } else {
        filter = { ...parentFilter.value };
      }
    }

    const urlFilter = getUrlFilterParam();
    if (urlFilter) {
      filter = { ...filter, ...urlFilter };
    }

    const orderBy: Record<string, string> = {};
    sortBy.value.forEach(sort => {
      orderBy[sort.key] = sort.order === 'desc' ? 'DESC' : 'ASC';
    });

    const result = await ApiGenericService.find<SaplingGenericItem>(entityHandle.value, { filter, orderBy, page: page.value, limit: itemsPerPage.value, relations: ['m:1'] });
    items.value = result.data;
    totalItems.value = result.meta.total;
  };
  // #endregion

  // #region Header Generation
  const generateHeaders = () => {
    headers.value = entityTemplates.value.filter((x: EntityTemplate) => {
      const template = entityTemplates.value.find((t: EntityTemplate) => t.name === x.name);
      return template && !(template.isAutoIncrement) && !(template.options?.includes('isSystem'));
    }).map((template: EntityTemplate) => ({
      ...template,
      key: template.name,
      title: i18n.global.t(`${entityHandle.value}.${template.name}`)
    }));
  };
  // #endregion

  // #region Watchers
  function initialSort(){
    // Sortiere nach der Spalte, die in den Template-Optionen 'isOrderASC' oder 'isOrderDESC' besitzt (options ist ein String-Array)
    const orderCol = entityTemplates.value.find(
      (t) => Array.isArray(t.options) && (t.options.includes('isOrderASC') || t.options.includes('isOrderDESC'))
    );
    if (orderCol && Array.isArray(orderCol.options)) {
      sortBy.value = [{
        key: orderCol.name,
        order: orderCol.options.includes('isOrderDESC') ? 'desc' : 'asc',
      }];
    } else {
      sortBy.value = [];
    }
  }

  onMounted(() => {
    genericStore.loadGeneric(entityHandle.value, 'global').then(() => {
    generateHeaders();
    initialSort();
    });
  });
  
  // Reload data when search, page, itemsPerPage, sortBy changes
  watch([search, page, itemsPerPage, sortBy, parentFilter], () => {
    loadData();
  }, { deep: true });


  // Reload everything when entity or key changes
  watch([isLoading], () => {
    if(isLoading.value) return;
    //reload();
  });

  // Reload everything when entity or key changes
  watch([entityHandle, () => route.query], () => {
    genericStore.loadGeneric(entityHandle.value, 'global').then(() => {
      generateHeaders();
      initialSort();
    });
  });
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
    page,
    itemsPerPage,
    headers,
    totalItems,
    sortBy,
    entity,
    entityPermission,
    parentFilter,
    loadData,
    onSearchUpdate,
    onPageUpdate,
    onItemsPerPageUpdate,
    onSortByUpdate,
    generateHeaders,
    initialSort,
  };
  // #endregion
}
// #endregion