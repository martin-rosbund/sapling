// #region Imports
import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import ApiGenericService from '@/services/api.generic.service'
import { i18n } from '@/i18n'
import type {
  ColumnFilterItem,
  EntityTemplate,
  SaplingTableHeaderItem,
  SortItem,
} from '@/entity/structure'
import type { SaplingGenericItem } from '@/entity/entity'
import { DEFAULT_PAGE_SIZE_MEDIUM } from '@/constants/project.constants'
import { useGenericStore } from '@/stores/genericStore'
import { extractColumnFiltersFromFilterQuery } from '@/composables/table/useSaplingTableFilterHelpers'
import {
  buildTableFilter,
  buildTableOrderBy,
  isGenericReferenceTemplate,
} from '@/utils/saplingTableUtil'
// #endregion

const TABLE_LOAD_DEBOUNCE_MS = 250

/**
 * Shared table state for entity-backed data tables.
 * Handles metadata loading, server pagination, sorting and column filtering.
 */
export function useSaplingTable(
  entityHandle: Ref<string>,
  itemsPerPageDefaultValue?: number,
  isUseQueryParameter?: boolean,
  autoInitialize = true,
) {
  // #region State
  const items = ref<SaplingGenericItem[]>([])
  const search = ref('')
  const headers = ref<SaplingTableHeaderItem[]>([])
  const page = ref(1)
  const itemsPerPageDefault = ref(itemsPerPageDefaultValue ?? DEFAULT_PAGE_SIZE_MEDIUM)
  const itemsPerPage = ref(itemsPerPageDefault.value)
  const totalItems = ref(0)
  const sortBy = ref<SortItem[]>([])
  const columnFilters = ref<Record<string, ColumnFilterItem>>({})
  const parentFilter = ref<Record<string, unknown>>({})
  const isResettingEntityState = ref(false)
  const isInitialized = ref(false)

  const route = useRoute()
  const genericStore = useGenericStore()
  let activeLoadController: AbortController | null = null
  let scheduledLoadTimeout: ReturnType<typeof setTimeout> | null = null
  let latestLoadRequestId = 0
  let latestInitializationId = 0
  // #endregion

  // #region Entity Metadata
  const entity = computed(() => genericStore.getState(entityHandle.value).entity)
  const entityPermission = computed(
    () => genericStore.getState(entityHandle.value).entityPermission,
  )
  const entityTemplates = computed(() => genericStore.getState(entityHandle.value).entityTemplates)
  const isLoading = computed(() => genericStore.getState(entityHandle.value).isLoading)
  // #endregion

  // #region Filters and Sorting
  function getUrlFilterParam() {
    if (!isUseQueryParameter) {
      return null
    }

    const filterParam = Array.isArray(route.query.filter)
      ? route.query.filter[0]
      : route.query.filter

    if (typeof filterParam !== 'string' || filterParam.length === 0) {
      return null
    }

    try {
      return JSON.parse(filterParam)
    } catch {
      return filterParam
    }
  }

  function getUrlSearchParam(): string {
    if (!isUseQueryParameter) {
      return ''
    }

    const searchParam = Array.isArray(route.query.search)
      ? route.query.search[0]
      : route.query.search

    return typeof searchParam === 'string' ? searchParam : ''
  }

  function getUrlSortByParam(): SortItem[] {
    if (!isUseQueryParameter) {
      return []
    }

    const sortByParam = Array.isArray(route.query.sortBy)
      ? route.query.sortBy[0]
      : route.query.sortBy

    if (typeof sortByParam !== 'string' || sortByParam.length === 0) {
      return []
    }

    try {
      const parsedSortBy = JSON.parse(sortByParam)
      if (!Array.isArray(parsedSortBy)) {
        return []
      }

      return parsedSortBy
        .filter(
          (item): item is SortItem =>
            item != null &&
            typeof item === 'object' &&
            'key' in item &&
            typeof item.key === 'string' &&
            item.key.length > 0,
        )
        .map((item) => ({
          key: item.key,
          order: item.order === 'desc' ? 'desc' : 'asc',
        }))
    } catch {
      return []
    }
  }

  function getUrlPageParam(): number {
    if (!isUseQueryParameter) {
      return 1
    }

    const value = Array.isArray(route.query.page) ? route.query.page[0] : route.query.page
    const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : NaN
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
  }

  function getUrlItemsPerPageParam(): number | null {
    if (!isUseQueryParameter) {
      return null
    }

    const value = Array.isArray(route.query.itemsPerPage)
      ? route.query.itemsPerPage[0]
      : route.query.itemsPerPage
    const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : NaN
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }

  const activeFilter = computed(() =>
    buildTableFilter({
      search: search.value,
      columnFilters: columnFilters.value,
      entityTemplates: entityTemplates.value,
      parentFilter: parentFilter.value,
    }),
  )

  const validSortBy = computed(() => {
    const validTemplateKeys = new Set(entityTemplates.value.map((template) => template.name))
    return sortBy.value.filter((sortItem) => validTemplateKeys.has(sortItem.key))
  })

  /**
   * Applies the first template-defined default ordering to the server query.
   */
  function initialSort(nextEntityTemplates = entityTemplates.value) {
    const urlSortBy = getUrlSortByParam()
    if (urlSortBy.length > 0) {
      sortBy.value = urlSortBy
      return
    }

    const orderColumn = nextEntityTemplates.find(
      (template) =>
        Array.isArray(template.options) &&
        (template.options.includes('isOrderASC') || template.options.includes('isOrderDESC')),
    )

    if (!orderColumn || !Array.isArray(orderColumn.options)) {
      sortBy.value = []
      return
    }

    sortBy.value = [
      {
        key: orderColumn.name,
        order: orderColumn.options.includes('isOrderDESC') ? 'desc' : 'asc',
      },
    ]
  }
  // #endregion

  // #region Data Loading
  async function loadData(options?: { entityHandle?: string; initializationId?: number }) {
    const currentEntityHandle = options?.entityHandle ?? entityHandle.value
    const initializationId = options?.initializationId

    if (isResettingEntityState.value || !currentEntityHandle) {
      return
    }

    activeLoadController?.abort()
    const loadController = new AbortController()
    activeLoadController = loadController
    const requestId = ++latestLoadRequestId

    try {
      const result = await ApiGenericService.find<SaplingGenericItem>(currentEntityHandle, {
        filter: activeFilter.value,
        orderBy: buildTableOrderBy(validSortBy.value),
        page: page.value,
        limit: itemsPerPage.value,
        relations: ['m:1'],
        signal: loadController.signal,
      })

      if (requestId !== latestLoadRequestId) {
        return
      }

      if (
        entityHandle.value !== currentEntityHandle ||
        (typeof initializationId === 'number' && initializationId !== latestInitializationId)
      ) {
        return
      }

      items.value = result.data
      totalItems.value = result.meta.total
    } catch (error) {
      if (isAbortError(error)) {
        return
      }

      throw error
    } finally {
      if (activeLoadController === loadController) {
        activeLoadController = null
      }
    }
  }

  function cancelScheduledLoad() {
    if (scheduledLoadTimeout) {
      clearTimeout(scheduledLoadTimeout)
      scheduledLoadTimeout = null
    }
  }

  function scheduleLoadData() {
    cancelScheduledLoad()
    scheduledLoadTimeout = setTimeout(() => {
      scheduledLoadTimeout = null
      void loadData()
    }, TABLE_LOAD_DEBOUNCE_MS)
  }

  function generateHeaders(nextEntityHandle = entityHandle.value) {
    const nextEntityTemplates = genericStore.getState(nextEntityHandle).entityTemplates

    headers.value = nextEntityTemplates
      .filter(
        (template) =>
          !template.isAutoIncrement &&
          (!template.options?.includes('isSystem') || isGenericReferenceTemplate(template)),
      )
      .map((template: EntityTemplate) => ({
        ...template,
        key: template.name,
        title: i18n.global.t(`${nextEntityHandle}.${template.name}`),
      }))
  }

  function resetEntityState() {
    items.value = []
    totalItems.value = 0
    headers.value = []
    page.value = getUrlPageParam()
    const urlItemsPerPage = getUrlItemsPerPageParam()
    if (urlItemsPerPage !== null) {
      itemsPerPage.value = urlItemsPerPage
    }
    search.value = getUrlSearchParam()
    sortBy.value = []
    columnFilters.value = {}
  }

  function restoreQueryFilterState(nextEntityTemplates: EntityTemplate[]) {
    const urlFilter = getUrlFilterParam()
    columnFilters.value = extractColumnFiltersFromFilterQuery(nextEntityTemplates, urlFilter)
  }

  async function initializeEntityState() {
    const currentEntityHandle = entityHandle.value
    const initializationId = ++latestInitializationId

    if (!currentEntityHandle) {
      return
    }

    isInitialized.value = false
    isResettingEntityState.value = true
    cancelScheduledLoad()
    activeLoadController?.abort()
    activeLoadController = null
    latestLoadRequestId += 1
    resetEntityState()

    try {
      await genericStore.loadGeneric(currentEntityHandle, 'global', 'filter', 'exception')

      if (
        initializationId !== latestInitializationId ||
        entityHandle.value !== currentEntityHandle
      ) {
        return
      }

      const nextEntityTemplates = genericStore.getState(currentEntityHandle).entityTemplates
      generateHeaders(currentEntityHandle)
      initialSort(nextEntityTemplates)
      restoreQueryFilterState(nextEntityTemplates)
    } finally {
      if (
        initializationId === latestInitializationId &&
        entityHandle.value === currentEntityHandle
      ) {
        isResettingEntityState.value = false
      }
    }

    if (initializationId !== latestInitializationId || entityHandle.value !== currentEntityHandle) {
      return
    }

    await loadData({
      entityHandle: currentEntityHandle,
      initializationId,
    })

    if (initializationId !== latestInitializationId || entityHandle.value !== currentEntityHandle) {
      return
    }

    isInitialized.value = true
  }
  // #endregion

  // #region Lifecycle and Watchers
  onMounted(() => {
    if (!autoInitialize) {
      return
    }

    void initializeEntityState()
  })

  onBeforeUnmount(() => {
    cancelScheduledLoad()
    activeLoadController?.abort()
    activeLoadController = null
  })

  watch(
    [search, page, itemsPerPage, sortBy, parentFilter, columnFilters],
    () => {
      if (isResettingEntityState.value || !isInitialized.value) {
        return
      }

      scheduleLoadData()
      syncUrlState()
    },
    { deep: true },
  )

  watch([entityHandle, () => route.query], () => {
    if (!autoInitialize && !isInitialized.value) {
      return
    }

    void initializeEntityState()
  })
  // #endregion

  // #region URL Sync
  /**
   * Persists user-controlled table state (search, page, itemsPerPage, sortBy, filter)
   * into the location bar via history.replaceState. We bypass vue-router's
   * `router.replace` here on purpose so the existing `route.query` watcher does
   * not trigger a full re-initialization for our own writes — browser back/forward
   * still works because popstate updates `route.query` and re-runs the watcher.
   */
  function syncUrlState() {
    if (!isUseQueryParameter || typeof window === 'undefined') {
      return
    }

    const params = new URLSearchParams(window.location.search)

    const searchValue = search.value.trim()
    if (searchValue) {
      params.set('search', searchValue)
    } else {
      params.delete('search')
    }

    if (page.value > 1) {
      params.set('page', String(page.value))
    } else {
      params.delete('page')
    }

    if (itemsPerPage.value && itemsPerPage.value !== itemsPerPageDefault.value) {
      params.set('itemsPerPage', String(itemsPerPage.value))
    } else {
      params.delete('itemsPerPage')
    }

    if (validSortBy.value.length > 0) {
      params.set('sortBy', JSON.stringify(validSortBy.value))
    } else {
      params.delete('sortBy')
    }

    const filterPayload = activeFilter.value
    if (filterPayload && Object.keys(filterPayload).length > 0) {
      params.set('filter', JSON.stringify(filterPayload))
    } else {
      params.delete('filter')
    }

    const queryString = params.toString()
    const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}${window.location.hash}`
    if (nextUrl !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, '', nextUrl)
    }
  }
  // #endregion

  // #region Event Handlers
  function onSearchUpdate(value: string) {
    if (isResettingEntityState.value) {
      return
    }

    search.value = value
    page.value = 1
  }

  function onPageUpdate(value: number) {
    if (isResettingEntityState.value) {
      return
    }

    page.value = value
  }

  function onItemsPerPageUpdate(value: number) {
    if (isResettingEntityState.value) {
      return
    }

    itemsPerPage.value = value
    page.value = 1
  }

  function onColumnFiltersUpdate(value: Record<string, ColumnFilterItem>) {
    if (isResettingEntityState.value) {
      return
    }

    columnFilters.value = { ...value }
    page.value = 1
  }

  function onSortByUpdate(value: SortItem[]) {
    if (isResettingEntityState.value) {
      return
    }

    sortBy.value = value
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
    isInitialized,
    initializeEntityState,
    loadData,
    onSearchUpdate,
    onPageUpdate,
    onItemsPerPageUpdate,
    onColumnFiltersUpdate,
    onSortByUpdate,
    generateHeaders,
    initialSort,
  }
  // #endregion
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ERR_CANCELED'
  )
}
