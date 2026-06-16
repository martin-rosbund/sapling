import { computed, ref, watch, type Ref } from 'vue'
import type { EntityTemplate } from '@/entity/structure'
import { useSaplingTable } from '@/composables/table/useSaplingTable'
import { useSaplingChipFilters } from '@/composables/filter/useSaplingChipFilters'
import type { SaplingChipFilterSelection } from '@/components/filter/saplingWorkFilter.types'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'

type PartnerHandle = number
type PartnerFilterClause = Record<string, { $in: PartnerHandle[] }>

/**
 * Centralizes table state and partner-specific filter logic for the partner screen.
 * The component remains template-focused while this composable owns entity changes,
 * selected people normalization and partner filter generation.
 */
export function useSaplingPartner(entityHandle: Ref<string>) {
  //#region State
  const currentPersonStore = useCurrentPersonStore()
  const selectedPeopleHandles = ref<PartnerHandle[]>([])

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
    isInitialized,
    loadData,
    onSearchUpdate,
    onPageUpdate,
    onItemsPerPageUpdate,
    onColumnFiltersUpdate,
    onSortByUpdate,
  } = useSaplingTable(entityHandle, undefined, true, true, () => ({
    beforeInitialLoad: prepareInitialPartnerFilter,
  }))

  const tableKey = computed(() => `${entityHandle.value}-table`)
  const filterDrawerKey = computed(() => `${entityHandle.value}-filter`)
  const partnerTemplates = computed(() =>
    entityTemplates.value.filter((template) => template.options?.includes('isPartner')),
  )
  const {
    chipFilters,
    selectedChipFilters,
    selectedChipFilterCount,
    loadChipFilters,
    clearChipFilters,
    onSelectedChipFiltersUpdate: updateSelectedChipFilters,
    buildChipFilterClauses,
  } = useSaplingChipFilters({
    entityHandle,
    entityTemplates,
  })
  //#endregion

  //#region Lifecycle
  watch(entityHandle, () => {
    selectedPeopleHandles.value = []
    clearChipFilters()
    applyPartnerFilter()
  })

  watch(
    entityTemplates,
    async () => {
      if (!isInitialized.value) {
        return
      }

      await loadChipFilters()
      applyPartnerFilter()
    },
    { deep: true },
  )

  watch(
    selectedChipFilters,
    () => {
      applyPartnerFilter()
    },
    { deep: true },
  )
  //#endregion

  //#region Methods
  /**
   * Updates the partner selection from the work filter drawer.
   */
  function onSelectedPeoplesUpdate(values: string[]) {
    selectedPeopleHandles.value = normalizePartnerHandles(values)
    applyPartnerFilter()
  }

  /**
   * Updates the selected chip reference filters from the shared work filter drawer.
   */
  function onSelectedChipFiltersUpdate(values: SaplingChipFilterSelection) {
    updateSelectedChipFilters(values)
  }

  /**
   * Prepares the default partner filter before the first table query is sent.
   */
  async function prepareInitialPartnerFilter() {
    await currentPersonStore.fetchCurrentPerson()
    selectedPeopleHandles.value =
      currentPersonStore.person?.handle != null ? [currentPersonStore.person.handle] : []

    await loadChipFilters()
    applyPartnerFilter()
  }

  /**
   * Rebuilds the table parent filter so partner fields and configured chips may match.
   */
  function applyPartnerFilter() {
    parentFilter.value = buildCombinedPartnerFilter(
      buildPartnerFilter(selectedPeopleHandles.value, partnerTemplates.value),
      buildChipFilterClauses(),
    )
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
    chipFilters,
    selectedChipFilters,
    selectedChipFilterCount,
    loadData,
    onSearchUpdate,
    onPageUpdate,
    onItemsPerPageUpdate,
    onColumnFiltersUpdate,
    onSortByUpdate,
    onSelectedPeoplesUpdate,
    onSelectedChipFiltersUpdate,
  }
  //#endregion
}

/**
 * Normalizes emitted drawer values into numeric person handles.
 */
function normalizePartnerHandles(values: string[]): PartnerHandle[] {
  return values.map((value) => Number.parseInt(value, 10)).filter((value) => !Number.isNaN(value))
}

/**
 * Builds an OR-based filter across all template fields marked with the partner option.
 */
function buildPartnerFilter(
  selectedPeopleHandles: PartnerHandle[],
  templates: EntityTemplate[],
): Record<string, unknown> {
  if (selectedPeopleHandles.length === 0 || templates.length === 0) {
    return {}
  }

  const orFilters = templates
    .map((template) => {
      const propertyName = template.name?.trim()
      return propertyName ? { [propertyName]: { $in: selectedPeopleHandles } } : null
    })
    .filter((filter): filter is PartnerFilterClause => filter !== null)

  return orFilters.length > 0 ? { $or: orFilters } : {}
}

function buildCombinedPartnerFilter(
  partnerFilter: Record<string, unknown>,
  chipFilterClauses: Record<string, unknown>[],
): Record<string, unknown> {
  const clauses = [
    ...(Object.keys(partnerFilter).length > 0 ? [partnerFilter] : []),
    ...chipFilterClauses,
  ]

  if (clauses.length === 0) {
    return {}
  }

  return clauses.length === 1 ? clauses[0] : { $and: clauses }
}
