import { computed, ref, watch, type Ref } from 'vue';
import type { EntityTemplate } from '@/entity/structure';
import { useSaplingTable } from '@/composables/table/useSaplingTable';

type PartnerHandle = number;
type PartnerFilterClause = Record<string, { $in: PartnerHandle[] }>;

/**
 * Centralizes table state and partner-specific filter logic for the partner screen.
 * The component remains template-focused while this composable owns entity changes,
 * selected people normalization and partner filter generation.
 */
export function useSaplingPartner(entityHandle: Ref<string>) {
  //#region State
  const selectedPeopleHandles = ref<PartnerHandle[]>([]);

  const {
    items,
    search,
    page,
    itemsPerPage,
    totalItems,
    isLoading,
    sortBy,
    columnFilters,
    activeFilter,
    entityTemplates,
    entity,
    entityPermission,
    parentFilter,
    loadData,
    onSearchUpdate,
    onPageUpdate,
    onItemsPerPageUpdate,
    onColumnFiltersUpdate,
    onSortByUpdate,
  } = useSaplingTable(entityHandle);

  const tableKey = computed(() => `${entityHandle.value}-table`);
  const filterDrawerKey = computed(() => `${entityHandle.value}-filter`);
  const partnerTemplates = computed(() =>
    entityTemplates.value.filter((template) => template.options?.includes('isPartner')),
  );
  //#endregion

  //#region Lifecycle
  watch(entityHandle, () => {
    selectedPeopleHandles.value = [];
    clearPartnerFilter();
  });

  watch(
    entityTemplates,
    () => {
      applyPartnerFilter(selectedPeopleHandles.value);
    },
    { deep: true },
  );
  //#endregion

  //#region Methods
  /**
   * Updates the partner selection from the work filter drawer.
   */
  function onSelectedPeoplesUpdate(values: string[]) {
    applyPartnerFilter(normalizePartnerHandles(values));
  }

  /**
   * Rebuilds the table parent filter so one configured partner field may match.
   */
  function applyPartnerFilter(values: PartnerHandle[]) {
    selectedPeopleHandles.value = [...values];
    parentFilter.value = buildPartnerFilter(selectedPeopleHandles.value, partnerTemplates.value);
  }

  /**
   * Clears the partner-specific parent filter.
   */
  function clearPartnerFilter() {
    parentFilter.value = {};
  }
  //#endregion

  //#region Return
  return {
    items,
    search,
    page,
    itemsPerPage,
    totalItems,
    isLoading,
    sortBy,
    columnFilters,
    activeFilter,
    entityTemplates,
    entity,
    entityPermission,
    parentFilter,
    tableKey,
    filterDrawerKey,
    loadData,
    onSearchUpdate,
    onPageUpdate,
    onItemsPerPageUpdate,
    onColumnFiltersUpdate,
    onSortByUpdate,
    onSelectedPeoplesUpdate,
  };
  //#endregion
}

/**
 * Normalizes emitted drawer values into numeric person handles.
 */
function normalizePartnerHandles(values: string[]): PartnerHandle[] {
  return values
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => !Number.isNaN(value));
}

/**
 * Builds an OR-based filter across all template fields marked with the partner option.
 */
function buildPartnerFilter(
  selectedPeopleHandles: PartnerHandle[],
  templates: EntityTemplate[],
): Record<string, unknown> {
  if (selectedPeopleHandles.length === 0 || templates.length === 0) {
    return {};
  }

  const orFilters = templates
    .map((template) => {
      const propertyName = template.name?.trim();
      return propertyName
        ? { [propertyName]: { $in: selectedPeopleHandles } }
        : null;
    })
    .filter((filter): filter is PartnerFilterClause => filter !== null);

  return orFilters.length > 0
    ? { $or: orFilters }
    : {};
}
