// #region Imports
import { computed, onMounted, ref, watch, type Ref } from 'vue';
import ApiGenericService from '@/services/api.generic.service';
import { i18n } from '@/i18n';
import type { EntityTemplate, SaplingTableHeaderItem, SortItem } from '@/entity/structure';
import type { SaplingGenericItem } from '@/entity/entity';
import { DEFAULT_PAGE_SIZE_MEDIUM } from '@/constants/project.constants';
import { useGenericStore } from '@/stores/genericStore';
// #endregion

// #region useSaplingTable Composable
/**
 * Composable for managing entity table state, data, and translations.
 * Handles loading, searching, sorting, and pagination for entity tables.
 * @param entityName - Ref to the entity name
 */
export function useSaplingTable(
  entityName: Ref<string>,
  itemsPerPageDefaultValue?: number,
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
  // #endregion

  // #region Entity Loader
  const genericStore = useGenericStore();
  genericStore.loadGeneric(entityName.value, 'noteGroup', 'global');
  const entity = computed(() => genericStore.getState(entityName.value).entity);
  const entityPermission = computed(() => genericStore.getState(entityName.value).entityPermission);
  const entityTemplates = computed(() => genericStore.getState(entityName.value).entityTemplates);
  const isLoading = computed(() => genericStore.getState(entityName.value).isLoading);

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
    // Build filter for search
    let filter = search.value
      ? { $or: entityTemplates.value.filter((x) => !x.isReference).map((t) => ({ [t.name]: { $like: `%${search.value}%` } })) }
      : {};

    if (parentFilter.value && parentFilter.value && Object.keys(parentFilter.value).length > 0) {
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

    const result = await ApiGenericService.find<SaplingGenericItem>(entityName.value, { filter, orderBy, page: page.value, limit: itemsPerPage.value, relations: ['m:1'] });
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
      title: i18n.global.t(`${entityName.value}.${template.name}`)
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
    genericStore.loadGeneric(entityName.value, 'global').then(() => {
    generateHeaders();
    initialSort();
    });
  });
  // Reload data when search, page, itemsPerPage, or sortBy changes
  watch([search, page, itemsPerPage, sortBy, parentFilter], loadData, { deep: true });

  // Reload everything when entity or key changes
  watch([isLoading], () => {
    if(isLoading.value) return;
    //reload();
  });

  // Reload everything when entity or key changes
  watch([entityName], () => {
    genericStore.loadGeneric(entityName.value, 'global').then(() => {
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
  };
  // #endregion
}
// #endregion