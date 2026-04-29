import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type {
  AccumulatedPermission,
  ColumnFilterItem,
  DialogState,
  EntityState,
  EntityTemplate,
  SortItem,
} from '@/entity/structure'
import type { EntityItem, SaplingGenericItem } from '@/entity/entity'
import { DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants'
import ApiGenericService from '@/services/api.generic.service'
import { useGenericStore } from '@/stores/genericStore'
import {
  buildTableFilter,
  buildTableOrderBy,
  getRelationTableHeaders,
} from '@/utils/saplingTableUtil'
import { sortDialogTemplates } from '@/utils/saplingDialogLayoutUtil'

type GetItemHandle = (item?: SaplingGenericItem | null) => string | number | null

interface UseSaplingDialogEditRelationsOptions {
  entity: ComputedRef<EntityItem | null>
  item: ComputedRef<SaplingGenericItem | null>
  mode: ComputedRef<DialogState>
  permissions: Ref<AccumulatedPermission[] | null>
  showReference: ComputedRef<boolean>
  templates: ComputedRef<EntityTemplate[]>
  t: (key: string) => string
  getItemHandle: GetItemHandle
}

export function useSaplingDialogEditRelations(options: UseSaplingDialogEditRelationsOptions) {
  const genericStore = useGenericStore()
  const relationTableItems = ref<Record<string, SaplingGenericItem[]>>({})
  const relationTableSearch = ref<Record<string, string>>({})
  const relationTablePage = ref<Record<string, number>>({})
  const relationTableTotal = ref<Record<string, number>>({})
  const relationTableItemsPerPage = ref<Record<string, number>>({})
  const relationTableSortBy = ref<Record<string, SortItem[]>>({})
  const relationTableColumnFilters = ref<Record<string, Record<string, ColumnFilterItem>>>({})
  const relationTableRequestId = ref<Record<string, number>>({})
  const selectedRelations = ref<Record<string, SaplingGenericItem[]>>({})
  const relationTableState = ref<Record<string, EntityState>>({})
  const selectedItems = ref<SaplingGenericItem[]>([])

  const relationTemplates = computed(() => {
    if (!options.showReference.value) {
      return []
    }

    return sortDialogTemplates(
      options.templates.value.filter(
        (template) =>
          ['1:m', 'm:n', 'n:m'].includes(template.kind || '') &&
          !template.options?.includes('isHideAsReference') &&
          options.permissions.value?.find(
            (permission) => permission.entityHandle === template.referenceName,
          )?.allowRead,
      ),
    )
  })

  const relationTableHeaders = computed(() =>
    getRelationTableHeaders(relationTableState.value, options.t, options.permissions.value ?? []),
  )

  function getRelationTemplateByName(name: string): EntityTemplate | undefined {
    return relationTemplates.value.find((template) => template.name === name)
  }

  function getRelationTableState(name: string): EntityState {
    return relationTableState.value[name] ?? (relationTableState.value[name] = {} as EntityState)
  }

  async function addRelation(template: EntityTemplate): Promise<void> {
    const items = Array.isArray(selectedRelations.value[template.name])
      ? selectedRelations.value[template.name]
      : []

    switch (template.kind) {
      case '1:m':
        await addRelation1M(template, items)
        break
      default:
        await addRelationNM(template, items)
        break
    }

    selectedRelations.value[template.name] = []
    selectedItems.value = []
    await loadRelationTableItem(template)
  }

  async function addRelationNM(
    template: EntityTemplate,
    items: SaplingGenericItem[],
  ): Promise<void> {
    const entityHandle = options.entity.value?.handle ?? ''
    const referenceName = template.name
    const entityItemHandle = options.getItemHandle(options.item.value)

    if (entityItemHandle == null) {
      return
    }

    for (const referenceItem of items) {
      const referenceItemHandle = options.getItemHandle(referenceItem)
      if (referenceItemHandle == null) {
        continue
      }

      await ApiGenericService.createReference(
        entityHandle,
        referenceName,
        entityItemHandle,
        referenceItemHandle,
      )
    }
  }

  async function removeRelation(
    template: EntityTemplate,
    itemsToRemove: SaplingGenericItem[],
  ): Promise<void> {
    switch (template.kind) {
      case '1:m':
        await removeRelation1M(template, itemsToRemove)
        break
      default:
        await removeRelationNM(template, itemsToRemove)
        break
    }
  }

  async function removeRelationNM(
    template: EntityTemplate,
    itemsToRemove: SaplingGenericItem[],
  ): Promise<void> {
    const entityHandle = options.entity.value?.handle ?? ''
    const referenceName = template.name
    const entityItemHandle = options.getItemHandle(options.item.value)

    if (entityItemHandle == null) {
      return
    }

    for (const referenceItem of itemsToRemove) {
      const referenceItemHandle = options.getItemHandle(referenceItem)
      if (referenceItemHandle == null) {
        continue
      }

      await ApiGenericService.deleteReference(
        entityHandle,
        referenceName,
        entityItemHandle,
        referenceItemHandle,
      )
    }

    selectedItems.value = []
    await loadRelationTableItem(template)
  }

  async function addRelation1M(
    template: EntityTemplate,
    items: SaplingGenericItem[],
  ): Promise<void> {
    const mappedBy = template.mappedBy
    const entityItemHandle = options.getItemHandle(options.item.value)

    if (!mappedBy || entityItemHandle == null) {
      return
    }

    for (const selected of items) {
      const selectedHandle = options.getItemHandle(selected)
      if (selectedHandle == null) {
        continue
      }

      selected[mappedBy] = entityItemHandle
      await ApiGenericService.update(template.referenceName ?? '', selectedHandle, selected)
    }
  }

  async function removeRelation1M(
    template: EntityTemplate,
    itemsToRemove: SaplingGenericItem[],
  ): Promise<void> {
    const mappedBy = template.mappedBy
    if (!mappedBy) {
      return
    }

    for (const selected of itemsToRemove) {
      const selectedHandle = options.getItemHandle(selected)
      if (selectedHandle == null) {
        continue
      }

      selected[mappedBy] = null
      await ApiGenericService.update(template.referenceName ?? '', selectedHandle, selected)
    }

    selectedItems.value = []
    await loadRelationTableItem(template)
  }

  async function initializeRelationTables(): Promise<void> {
    await loadRelationTableTemplates()

    for (const template of relationTemplates.value) {
      relationTableSearch.value[template.name] = ''
      relationTablePage.value[template.name] = 1
      relationTableTotal.value[template.name] = 0
      relationTableItemsPerPage.value[template.name] = DEFAULT_PAGE_SIZE_SMALL
      relationTableColumnFilters.value[template.name] = {}
      relationTableRequestId.value[template.name] = 0
    }

    await loadRelationTableItems()
  }

  async function loadRelationTableTemplates(): Promise<void> {
    const relationLoadRequests = relationTemplates.value
      .map((template) => template.referenceName?.trim())
      .filter((referenceName): referenceName is string => Boolean(referenceName))
      .map((referenceName) => ({
        entityHandle: referenceName,
        namespaces: ['global'],
      }))

    if (relationLoadRequests.length > 0) {
      await genericStore.loadGenericMany(relationLoadRequests)
    }

    for (const template of relationTemplates.value) {
      const tableState = getRelationTableState(template.name)
      const state = genericStore.getState(template.referenceName ?? '')
      tableState.entityTemplates = state.entityTemplates
      tableState.entity = state.entity
      tableState.entityPermission = state.entityPermission
    }
  }

  async function loadRelationTableItem(template: EntityTemplate): Promise<void> {
    const relState = getRelationTableState(template.name)
    const requestId = (relationTableRequestId.value[template.name] ?? 0) + 1
    relationTableRequestId.value[template.name] = requestId
    relState.isLoading = true

    try {
      const filter: Record<string, unknown> = {}
      if (options.item.value && (template.mappedBy || template.inversedBy)) {
        const itemHandle = options.getItemHandle(options.item.value)
        const indexKey = template.mappedBy ?? template.inversedBy
        if (indexKey && itemHandle != null) {
          filter[indexKey] = itemHandle
        }
      }

      const search = relationTableSearch.value[template.name] || ''
      const page = relationTablePage.value[template.name] || 1
      const limit = relationTableItemsPerPage.value[template.name] || DEFAULT_PAGE_SIZE_SMALL
      const sortBy = relationTableSortBy.value[template.name] || []
      const columns = relationTableState.value[template.name]?.entityTemplates ?? []
      const columnFilters = relationTableColumnFilters.value[template.name] || {}

      if (options.mode.value === 'edit' && options.item.value && template.referenceName) {
        const apiFilter = buildTableFilter({
          search,
          columnFilters,
          entityTemplates: columns,
          parentFilter: filter,
        })

        const result = await ApiGenericService.find<SaplingGenericItem>(template.referenceName, {
          filter: apiFilter,
          limit,
          page,
          orderBy: buildTableOrderBy(sortBy),
          relations: ['m:1'],
        })

        if (relationTableRequestId.value[template.name] !== requestId) {
          return
        }

        relationTableItems.value[template.name] = result.data
        relationTableTotal.value[template.name] = result.meta?.total ?? result.data.length
        return
      }

      if (relationTableRequestId.value[template.name] !== requestId) {
        return
      }

      relationTableItems.value[template.name] = []
      relationTableTotal.value[template.name] = 0
    } catch (error) {
      if (relationTableRequestId.value[template.name] === requestId) {
        relationTableItems.value[template.name] = []
        relationTableTotal.value[template.name] = 0
      }
      console.error(`Error loading relation table items for ${template.name}:`, error)
    } finally {
      if (relationTableRequestId.value[template.name] === requestId) {
        relState.isLoading = false
      }
    }
  }

  async function loadRelationTableItems(names?: string[]): Promise<void> {
    const templatesToLoad = names?.length
      ? names
          .map(getRelationTemplateByName)
          .filter((template): template is EntityTemplate => Boolean(template))
      : relationTemplates.value

    await Promise.all(templatesToLoad.map((template) => loadRelationTableItem(template)))
  }

  function loadRelationTableItemByName(name: string): void {
    const template = getRelationTemplateByName(name)
    if (!template) {
      return
    }

    void loadRelationTableItem(template)
  }

  function onRelationTablePage(name: string, value: number): void {
    relationTablePage.value[name] = value
    loadRelationTableItemByName(name)
  }

  function onRelationTableItemsPerPage(name: string, value: number): void {
    relationTableItemsPerPage.value[name] = value
    relationTablePage.value[name] = 1
    loadRelationTableItemByName(name)
  }

  function onRelationTableSort(name: string, value: SortItem[]): void {
    relationTableSortBy.value[name] = value
    relationTablePage.value[name] = 1
    loadRelationTableItemByName(name)
  }

  function onRelationTableColumnFilters(
    name: string,
    value: Record<string, ColumnFilterItem>,
  ): void {
    relationTableColumnFilters.value[name] = { ...value }
    relationTablePage.value[name] = 1
    loadRelationTableItemByName(name)
  }

  function onRelationTableReload(name: string): void {
    onRelationTablePage(name, relationTablePage.value[name] || 1)
  }

  function clearSelectedItems(): void {
    selectedItems.value = []
  }

  function resetRelationSelections(): void {
    selectedItems.value = []
    selectedRelations.value = {}
  }

  return {
    relationTemplates,
    relationTableHeaders,
    relationTableState,
    relationTableItems,
    relationTableSearch,
    relationTablePage,
    relationTableTotal,
    relationTableItemsPerPage,
    relationTableSortBy,
    relationTableColumnFilters,
    selectedRelations,
    selectedItems,
    addRelation,
    removeRelation,
    initializeRelationTables,
    loadRelationTableItems,
    onRelationTablePage,
    onRelationTableItemsPerPage,
    onRelationTableSort,
    onRelationTableColumnFilters,
    onRelationTableReload,
    clearSelectedItems,
    resetRelationSelections,
  }
}
