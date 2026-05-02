import type { FilterQuery } from '@/services/api.generic.service'

/**
 * Shared helpers for reference select fields that combine parent and placeholder filters.
 */
export function useSaplingReferenceFilter() {
  //#region Methods
  function combineFilters(...filters: Array<FilterQuery | undefined>): FilterQuery {
    const activeFilters = filters.filter(
      (filter): filter is FilterQuery => !!filter && Object.keys(filter).length > 0,
    )

    if (activeFilters.length === 0) {
      return {}
    }

    if (activeFilters.length === 1) {
      return activeFilters[0]
    }

    return {
      $and: activeFilters,
    }
  }

  function normalizeFilter(filter?: FilterQuery): FilterQuery {
    return filter ? (JSON.parse(JSON.stringify(filter)) as FilterQuery) : {}
  }

  function areFiltersEqual(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
    return JSON.stringify(left) === JSON.stringify(right)
  }
  //#endregion

  //#region Return
  return {
    combineFilters,
    normalizeFilter,
    areFiltersEqual,
  }
  //#endregion
}
