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
import { buildTableFilter, buildTableOrderBy } from '@/utils/saplingTableUtil'
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

  const activeFilter = computed(() =>
    buildTableFilter({
      search: search.value,
      columnFilters: columnFilters.value,
      entityTemplates: entityTemplates.value,
      parentFilter: parentFilter.value,
      urlFilter: getUrlFilterParam(),
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
      .filter((template) => !template.isAutoIncrement && !template.options?.includes('isSystem'))
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
    page.value = 1
    search.value = getUrlSearchParam()
    sortBy.value = []
    columnFilters.value = {}
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
