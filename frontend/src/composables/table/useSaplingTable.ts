// #region Imports
import { computed, onMounted, ref, watch, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import ApiGenericService from '@/services/api.generic.service';
import { i18n } from '@/i18n';
import type { ColumnFilterItem, EntityTemplate, SaplingTableHeaderItem, SortItem } from '@/entity/structure';
import type { SaplingGenericItem } from '@/entity/entity';
import { DEFAULT_PAGE_SIZE_MEDIUM } from '@/constants/project.constants';
import { useGenericStore } from '@/stores/genericStore';
import { buildTableFilter, buildTableOrderBy } from '@/utils/saplingTableUtil';
// #endregion

/**
 * Shared table state for entity-backed data tables.
 * Handles metadata loading, server pagination, sorting and column filtering.
 */
export function useSaplingTable(
  entityHandle: Ref<string>,
  itemsPerPageDefaultValue?: number,
  isUseQueryParameter?: boolean,
) {
  // #region State
  const items = ref<SaplingGenericItem[]>([]);
  const search = ref('');
  const headers = ref<SaplingTableHeaderItem[]>([]);
  const page = ref(1);
  const itemsPerPageDefault = ref(itemsPerPageDefaultValue ?? DEFAULT_PAGE_SIZE_MEDIUM);
  const itemsPerPage = ref(itemsPerPageDefault.value);
  const totalItems = ref(0);
  const sortBy = ref<SortItem[]>([]);
  const columnFilters = ref<Record<string, ColumnFilterItem>>({});
  const parentFilter = ref<Record<string, unknown>>({});
  const isResettingEntityState = ref(false);
  const isInitialized = ref(false);

  const route = useRoute();
  const genericStore = useGenericStore();
  // #endregion

  // #region Entity Metadata
  const entity = computed(() => genericStore.getState(entityHandle.value).entity);
  const entityPermission = computed(() => genericStore.getState(entityHandle.value).entityPermission);
  const entityTemplates = computed(() => genericStore.getState(entityHandle.value).entityTemplates);
  const isLoading = computed(() => genericStore.getState(entityHandle.value).isLoading);
  // #endregion

  // #region Filters and Sorting
  function getUrlFilterParam() {
    if (!isUseQueryParameter) {
      return null;
    }

    const filterParam = Array.isArray(route.query.filter)
      ? route.query.filter[0]
      : route.query.filter;

    if (typeof filterParam !== 'string' || filterParam.length === 0) {
      return null;
    }

    try {
      return JSON.parse(filterParam);
    } catch {
      return filterParam;
    }
  }

  function getUrlSearchParam(): string {
    if (!isUseQueryParameter) {
      return '';
    }

    const searchParam = Array.isArray(route.query.search)
      ? route.query.search[0]
      : route.query.search;

    return typeof searchParam === 'string' ? searchParam : '';
  }

  const activeFilter = computed(() => buildTableFilter({
    search: search.value,
    columnFilters: columnFilters.value,
    entityTemplates: entityTemplates.value,
    parentFilter: parentFilter.value,
    urlFilter: getUrlFilterParam(),
  }));

  const validSortBy = computed(() => {
    const validTemplateKeys = new Set(entityTemplates.value.map((template) => template.name));
    return sortBy.value.filter((sortItem) => validTemplateKeys.has(sortItem.key));
  });

  /**
   * Applies the first template-defined default ordering to the server query.
   */
  function initialSort() {
    const orderColumn = entityTemplates.value.find((template) =>
      Array.isArray(template.options)
      && (template.options.includes('isOrderASC') || template.options.includes('isOrderDESC')),
    );

    if (!orderColumn || !Array.isArray(orderColumn.options)) {
      sortBy.value = [];
      return;
    }

    sortBy.value = [{
      key: orderColumn.name,
      order: orderColumn.options.includes('isOrderDESC') ? 'desc' : 'asc',
    }];
  }
  // #endregion

  // #region Data Loading
  async function loadData() {
    if (isResettingEntityState.value || !entityHandle.value) {
      return;
    }

    const result = await ApiGenericService.find<SaplingGenericItem>(entityHandle.value, {
      filter: activeFilter.value,
      orderBy: buildTableOrderBy(validSortBy.value),
      page: page.value,
      limit: itemsPerPage.value,
      relations: ['m:1'],
    });

    items.value = result.data;
    totalItems.value = result.meta.total;
  }

  function generateHeaders() {
    headers.value = entityTemplates.value
      .filter((template) => !template.isAutoIncrement && !template.options?.includes('isSystem'))
      .map((template: EntityTemplate) => ({
        ...template,
        key: template.name,
        title: i18n.global.t(`${entityHandle.value}.${template.name}`),
      }));
  }

  function resetEntityState() {
    items.value = [];
    totalItems.value = 0;
    headers.value = [];
    page.value = 1;
    search.value = getUrlSearchParam();
    sortBy.value = [];
    columnFilters.value = {};
  }

  async function initializeEntityState() {
    if (!entityHandle.value) {
      return;
    }

    isInitialized.value = false;
    isResettingEntityState.value = true;
    resetEntityState();

    try {
      await genericStore.loadGeneric(entityHandle.value, 'global', 'filter', 'exception');
      generateHeaders();
      initialSort();
    } finally {
      isResettingEntityState.value = false;
    }

    await loadData();
    isInitialized.value = true;
  }
  // #endregion

  // #region Lifecycle and Watchers
  onMounted(() => {
    void initializeEntityState();
  });

  watch([search, page, itemsPerPage, sortBy, parentFilter, columnFilters], () => {
    if (isResettingEntityState.value || !isInitialized.value) {
      return;
    }

    void loadData();
  }, { deep: true });

  watch([entityHandle, () => route.query], () => {
    void initializeEntityState();
  });
  // #endregion

  // #region Event Handlers
  function onSearchUpdate(value: string) {
    search.value = value;
    page.value = 1;
  }

  function onPageUpdate(value: number) {
    page.value = value;
  }

  function onItemsPerPageUpdate(value: number) {
    itemsPerPage.value = value;
    page.value = 1;
  }

  function onColumnFiltersUpdate(value: Record<string, ColumnFilterItem>) {
    columnFilters.value = { ...value };
    page.value = 1;
  }

  function onSortByUpdate(value: any) {
    sortBy.value = value as SortItem[];
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
    columnFilters,
    activeFilter,
    entity,
    entityPermission,
    parentFilter,
    loadData,
    onSearchUpdate,
    onPageUpdate,
    onItemsPerPageUpdate,
    onColumnFiltersUpdate,
    onSortByUpdate,
    generateHeaders,
    initialSort,
  };
  // #endregion
}