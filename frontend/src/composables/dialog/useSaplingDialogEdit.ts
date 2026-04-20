// #region Imports
import { ref, watch, onMounted, computed, nextTick, type Ref } from 'vue'
import type {
  AccumulatedPermission,
  ColumnFilterItem,
  DialogSaveAction,
  DialogState,
  EntityState,
  EntityTemplate,
  SortItem,
} from '@/entity/structure'
import { useGenericStore } from '@/stores/genericStore'
import ApiGenericService, { type FilterQuery } from '@/services/api.generic.service'
import { DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants'
import { useI18n } from 'vue-i18n'
import type { EntityItem, SaplingGenericItem } from '@/entity/entity'
import { mdiIcons } from '@/constants/mdi.icons'
import {
  buildTableFilter,
  buildTableOrderBy,
  getEditDialogHeaders,
  getRelationTableHeaders,
  isTextSearchableTemplate,
} from '@/utils/saplingTableUtil'
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
// #endregion

// #region Types
type VuetifyFormValidationResult = boolean | { valid: boolean } | undefined

type VuetifyFormRef = {
  validate: () => Promise<VuetifyFormValidationResult>
}

type DependencyComparableValue = string | number | boolean

type SaplingDialogEditEmit = {
  (event: 'update:modelValue', value: boolean): void
  (event: 'save', value: SaplingGenericItem, action: DialogSaveAction): void
  (event: 'cancel'): void
  (event: 'update:mode', value: DialogState): void
  (event: 'update:item', value: SaplingGenericItem | null): void
}

interface UseSaplingDialogEditProps {
  modelValue: boolean
  mode: DialogState
  item: SaplingGenericItem | null
  parent?: SaplingGenericItem | null
  parentEntity?: EntityItem | null
  entity: EntityItem | null
  templates: EntityTemplate[]
  showReference?: boolean
}
// #endregion

/**
 * Encapsulates the full edit dialog workflow including initialization,
 * relation management and payload normalization before save.
 */
export function useSaplingDialogEdit(
  props: UseSaplingDialogEditProps,
  emit: SaplingDialogEditEmit,
) {
  // #region State
  const { t } = useI18n()
  const genericStore = useGenericStore()
  const templates = computed(() => props.templates ?? [])
  const showReference = props.showReference !== false
  const isLoading = ref(true)
  const form: Ref<SaplingGenericItem> = ref({})
  const formRef: Ref<VuetifyFormRef | null> = ref(null)
  const referenceColumnsMap: Ref<Record<string, EntityTemplate[]>> = ref({})
  const activeTab = ref(0)
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
  const permissions = ref<AccumulatedPermission[] | null>(null)
  const currentPersonStore = useCurrentPersonStore()
  const iconNames = mdiIcons
  const selectedItems = ref<SaplingGenericItem[]>([])
  const isHydratingForm = ref(false)
  // #endregion

  // #region Helpers
  /**
   * Extracts a stable backend handle from a generic record.
   */
  function getItemHandle(item?: SaplingGenericItem | null): string | number | null {
    if (!item || typeof item !== 'object') {
      return null
    }

    const { handle } = item
    return typeof handle === 'string' || typeof handle === 'number' ? handle : null
  }

  /**
   * Normalizes Vuetify form validation results across supported return shapes.
   */
  function isFormValid(result: VuetifyFormValidationResult): boolean {
    if (typeof result === 'boolean') {
      return result
    }

    return result?.valid === true
  }

  /**
   * Checks whether a form value already contains meaningful user input.
   */
  function hasFormValue(value: unknown): boolean {
    if (Array.isArray(value)) {
      return value.length > 0
    }

    return value !== null && value !== undefined && value !== ''
  }

  function getTemplateByName(name: string): EntityTemplate | undefined {
    return templates.value.find((template) => template.name === name)
  }

  function getRelationTemplateByName(name: string): EntityTemplate | undefined {
    return relationTemplates.value.find((template) => template.name === name)
  }

  function getRelationTableState(name: string): EntityState {
    return relationTableState.value[name] ?? (relationTableState.value[name] = {} as EntityState)
  }

  function extractDependencyIdentifier(
    value: unknown,
    template?: EntityTemplate,
  ): DependencyComparableValue | Record<string, unknown> | null {
    if (typeof value === 'string') {
      const trimmedValue = value.trim()
      return trimmedValue ? trimmedValue : null
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return value
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null
    }

    const recordValue = value as SaplingGenericItem
    const identifierKeys = template?.referencedPks?.length
      ? template.referencedPks
      : ['handle', 'id']
    const identifierEntries = identifierKeys
      .map((key) => [key, recordValue[key]] as const)
      .filter((entry): entry is readonly [string, DependencyComparableValue] => {
        const [, entryValue] = entry
        return (
          typeof entryValue === 'string' ||
          typeof entryValue === 'number' ||
          typeof entryValue === 'boolean'
        )
      })

    if (identifierEntries.length === 0) {
      return null
    }

    if (identifierEntries.length === 1) {
      return identifierEntries[0][1]
    }

    return Object.fromEntries(identifierEntries)
  }

  function areDependencyIdentifiersEqual(
    left: DependencyComparableValue | Record<string, unknown> | null,
    right: DependencyComparableValue | Record<string, unknown> | null,
  ): boolean {
    if (left == null || right == null) {
      return left === right
    }

    if (typeof left === 'object' || typeof right === 'object') {
      return JSON.stringify(left) === JSON.stringify(right)
    }

    return String(left) === String(right)
  }

  function buildEmptyDependencyFilter(targetField: string): FilterQuery {
    return {
      [targetField]: { $in: [] },
    }
  }

  function getReferenceParentFilter(template: EntityTemplate): FilterQuery {
    const dependency = template.referenceDependency
    if (!dependency?.parentField || !dependency.targetField) {
      return {}
    }

    const parentTemplate = getTemplateByName(dependency.parentField)
    const parentIdentifier = extractDependencyIdentifier(
      form.value[dependency.parentField],
      parentTemplate,
    )

    if (parentIdentifier == null) {
      return dependency.requireParent ? buildEmptyDependencyFilter(dependency.targetField) : {}
    }

    if (typeof parentIdentifier === 'object') {
      return {
        [dependency.targetField]: parentIdentifier,
      }
    }

    return {
      [dependency.targetField]: { $eq: parentIdentifier },
    }
  }

  function isReferenceDependencyBlocked(template: EntityTemplate): boolean {
    const dependency = template.referenceDependency
    if (!dependency?.requireParent) {
      return false
    }

    const parentTemplate = getTemplateByName(dependency.parentField)
    return extractDependencyIdentifier(form.value[dependency.parentField], parentTemplate) == null
  }

  function isReferenceValueValidForDependency(template: EntityTemplate): boolean {
    const dependency = template.referenceDependency
    if (!dependency?.parentField || !dependency.targetField) {
      return true
    }

    const childValue = form.value[template.name]
    if (!hasFormValue(childValue)) {
      return true
    }

    const parentTemplate = getTemplateByName(dependency.parentField)
    const parentIdentifier = extractDependencyIdentifier(
      form.value[dependency.parentField],
      parentTemplate,
    )

    if (parentIdentifier == null) {
      return !dependency.requireParent
    }

    if (!childValue || typeof childValue !== 'object' || Array.isArray(childValue)) {
      return false
    }

    const childRecord = childValue as SaplingGenericItem
    const childIdentifier = extractDependencyIdentifier(childRecord[dependency.targetField])

    return areDependencyIdentifiersEqual(parentIdentifier, childIdentifier)
  }
  // #endregion

  // #region Templates
  const visibleTemplates = computed(() =>
    getEditDialogHeaders(templates.value, props.mode, showReference, permissions.value || []),
  )

  const relationTemplates = computed(() => {
    if (!showReference) {
      return []
    }

    return templates.value.filter(
      (x) =>
        ['1:m', 'm:n', 'n:m'].includes(x.kind || '') &&
        !x.options?.includes('isHideAsReference') &&
        permissions?.value?.find((p) => p.entityHandle === x.referenceName)?.allowRead,
    )
  })
  // #endregion

  // #region Reference
  async function addRelation(template: EntityTemplate) {
    const items = Array.isArray(selectedRelations.value[template.name])
      ? selectedRelations.value[template.name]
      : []
    switch (template.kind) {
      case '1:m':
        await addRelation1M(template, items ?? [])
        break
      default:
        await addRelationNM(template, items ?? [])
        break
    }
    selectedRelations.value[template.name] = []
    selectedItems.value = []
    await loadRelationTableItem(template)
  }
  // #endregion

  // #region Reference n:m m:n
  const relationTableHeaders = computed(() => getRelationTableHeaders(relationTableState.value, t))

  async function addRelationNM(template: EntityTemplate, items: SaplingGenericItem[]) {
    const entityHandle = props.entity?.handle ?? ''
    const referenceName = template.name
    const entityItemHandle = getItemHandle(props.item)

    if (entityItemHandle == null) {
      return
    }

    for (const referenceItem of items) {
      const referenceItemHandle = getItemHandle(referenceItem)
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

  async function removeRelation(template: EntityTemplate, selectedItems: SaplingGenericItem[]) {
    switch (template.kind) {
      case '1:m':
        await removeRelation1M(template, selectedItems)
        break
      default:
        await removeRelationNM(template, selectedItems)
        break
    }
  }

  async function removeRelationNM(template: EntityTemplate, itemsToRemove: SaplingGenericItem[]) {
    const entityHandle = props.entity?.handle ?? ''
    const referenceName = template.name
    const entityItemHandle = getItemHandle(props.item)

    if (entityItemHandle == null) {
      return
    }

    for (const referenceItem of itemsToRemove) {
      const referenceItemHandle = getItemHandle(referenceItem)
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
  // #endregion

  // #region Reference 1:m
  async function addRelation1M(template: EntityTemplate, items: SaplingGenericItem[]) {
    const mappedBy = template.mappedBy
    const entityItemHandle = getItemHandle(props.item)

    if (!mappedBy || entityItemHandle == null) {
      return
    }

    for (const selected of items) {
      const selectedHandle = getItemHandle(selected)
      if (selectedHandle == null) {
        continue
      }

      selected[mappedBy] = entityItemHandle
      await ApiGenericService.update(template.referenceName ?? '', selectedHandle, selected)
    }
  }

  async function removeRelation1M(template: EntityTemplate, itemsToRemove: SaplingGenericItem[]) {
    const mappedBy = template.mappedBy
    if (!mappedBy) {
      return
    }

    for (const selected of itemsToRemove) {
      const selectedHandle = getItemHandle(selected)
      if (selectedHandle == null) {
        continue
      }

      selected[mappedBy] = null
      await ApiGenericService.update(template.referenceName ?? '', selectedHandle, selected)
    }
    selectedItems.value = []
    await loadRelationTableItem(template)
  }
  // #endregion

  // #region Reference Dropdown
  async function initialize() {
    isLoading.value = true

    await currentPersonStore.fetchCurrentPerson()
    await setEntitiesPermissions()

    const referencePromises = templates.value
      .filter((t) => t.isReference)
      .map(ensureReferenceColumns)
    await Promise.all(referencePromises)
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
    isLoading.value = false
  }

  async function loadRelationTableTemplates() {
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
      if (props.item && (template.mappedBy || template.inversedBy)) {
        const itemHandle = getItemHandle(props.item)
        const indexKey = template.mappedBy ?? template.inversedBy
        if (indexKey && itemHandle != null) {
          filter[indexKey] = itemHandle
        }
      }

      const search = relationTableSearch.value[template.name] || ''
      const page = relationTablePage.value[template.name] || 1
      const limit = relationTableItemsPerPage.value[template.name] || DEFAULT_PAGE_SIZE_SMALL
      const sortBy = relationTableSortBy.value[template.name] || []
      const columns: EntityTemplate[] =
        relationTableState.value[template.name]?.entityTemplates ?? []
      const columnFilters = relationTableColumnFilters.value[template.name] || {}

      if (props.mode === 'edit' && props.item && template.referenceName) {
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

  function onRelationTablePage(name: string, val: number) {
    relationTablePage.value[name] = val
    loadRelationTableItemByName(name)
  }

  function onRelationTableItemsPerPage(name: string, val: number) {
    relationTableItemsPerPage.value[name] = val
    relationTablePage.value[name] = 1
    loadRelationTableItemByName(name)
  }

  function onRelationTableSort(name: string, val: SortItem[]) {
    relationTableSortBy.value[name] = val
    relationTablePage.value[name] = 1
    loadRelationTableItemByName(name)
  }

  function onRelationTableColumnFilters(name: string, val: Record<string, ColumnFilterItem>) {
    relationTableColumnFilters.value[name] = { ...val }
    relationTablePage.value[name] = 1
    loadRelationTableItemByName(name)
  }

  function onRelationTableReload(name: string) {
    // Just reload the items for this relation
    onRelationTablePage(name, relationTablePage.value[name] || 1)
  }

  async function fetchReferenceData(
    template: EntityTemplate,
    { search, page, pageSize }: { search: string; page: number; pageSize: number },
  ): Promise<{ items: Record<string, SaplingGenericItem>[]; total: number }> {
    const entityHandle = template.referenceName
    let filter: Record<string, unknown> = {}
    const columns = getReferenceColumnsSync(template).filter(isTextSearchableTemplate)
    if (search && columns.length > 0) {
      filter = {
        $or: columns.map((col) => ({ [col.key]: { $ilike: `%${search}%` } })),
      }
    }
    const result = await ApiGenericService.find<SaplingGenericItem>(entityHandle ?? '', {
      filter,
      page,
      limit: pageSize,
    })
    return {
      items: result.data as Record<string, SaplingGenericItem>[],
      total: result.meta.total,
    }
  }

  function getReferenceColumnsSync(template: EntityTemplate): EntityTemplate[] {
    const entityHandle = template.referenceName
    return referenceColumnsMap.value[entityHandle ?? ''] ?? []
  }

  async function ensureReferenceColumns(template: EntityTemplate): Promise<void> {
    const entityHandle = template.referenceName
    if (!referenceColumnsMap.value[entityHandle ?? '']) {
      await genericStore.loadGeneric(entityHandle ?? '', 'global')
      const state = genericStore.getState(entityHandle ?? '')
      const templates = state.entityTemplates
      referenceColumnsMap.value[entityHandle ?? ''] = templates
        .filter(
          (t) =>
            !t.isAutoIncrement &&
            !t.isReference &&
            !t.options?.includes('isSecurity') &&
            !t.options?.includes('isSystem'),
        )
        .map((t) => ({ ...t, key: t.name }))
    }
  }
  // #endregion

  function formatLocalDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  function formatLocalTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  function isValidDate(date: Date): boolean {
    return !Number.isNaN(date.getTime())
  }

  function getLocalDateTimeParts(value: unknown): { date: string; time: string } {
    if (value instanceof Date) {
      return isValidDate(value)
        ? { date: formatLocalDate(value), time: formatLocalTime(value) }
        : { date: '', time: '' }
    }

    if (typeof value !== 'string') {
      return { date: '', time: '' }
    }

    const trimmedValue = value.trim()
    if (!trimmedValue) {
      return { date: '', time: '' }
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
      return { date: trimmedValue, time: '' }
    }

    const parsedDate = new Date(trimmedValue)
    if (isValidDate(parsedDate)) {
      return {
        date: formatLocalDate(parsedDate),
        time: formatLocalTime(parsedDate),
      }
    }

    const [date = '', time = ''] = trimmedValue.split('T')
    return { date, time: time.slice(0, 5) }
  }

  function toUtcIsoString(dateValue: unknown, timeValue: unknown): string | null {
    const date =
      typeof dateValue === 'string'
        ? dateValue.trim()
        : dateValue instanceof Date
          ? formatLocalDate(dateValue)
          : ''

    if (!date) {
      return null
    }

    const time =
      typeof timeValue === 'string'
        ? timeValue.trim()
        : timeValue instanceof Date
          ? formatLocalTime(timeValue)
          : ''

    if (!time) {
      return date
    }

    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
    const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time)
    if (!dateMatch || !timeMatch) {
      return `${date}T${time}`
    }

    const [, year, month, day] = dateMatch
    const [, hours, minutes, seconds] = timeMatch
    const localDateTime = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds ?? '0'),
    )

    return isValidDate(localDateTime) ? localDateTime.toISOString() : `${date}T${time}`
  }

  function applyCurrentDefaults(): void {
    if (props.mode !== 'create' || props.item || !currentPersonStore.person) {
      return
    }

    const currentCompany = getCurrentCompanyReference()

    templates.value
      .filter((template) => template.isReference && template.options?.includes('isCurrentPerson'))
      .forEach((template) => {
        if (form.value[template.name] == null || form.value[template.name] === '') {
          form.value[template.name] = currentPersonStore.person
        }
      })

    templates.value
      .filter((template) => template.isReference && template.options?.includes('isCurrentCompany'))
      .forEach((template) => {
        if (form.value[template.name] == null || form.value[template.name] === '') {
          form.value[template.name] = currentCompany
        }
      })
  }

  function getCurrentCompanyReference(): SaplingGenericItem | null {
    const company = currentPersonStore.person?.company

    if (!company) {
      return null
    }

    if (typeof company === 'object') {
      return company
    }

    return { handle: company }
  }

  // #region Form
  function initializeForm(): void {
    const now = new Date()
    const currentCompany = getCurrentCompanyReference()
    isHydratingForm.value = true
    form.value = {}
    templates.value.forEach((t) => {
      if (t.isReference) {
        if (props.item) {
          const val = props.item[t.name]
          form.value[t.name] = val && typeof val === 'object' ? val : null
        } else if (t.options?.includes('isCurrentPerson') && currentPersonStore.person) {
          form.value[t.name] = currentPersonStore.person
        } else if (t.options?.includes('isCurrentCompany') && currentCompany) {
          form.value[t.name] = currentCompany
        } else {
          form.value[t.name] = null
        }
      } else if (t.type === 'datetime') {
        const dateField = props.item?.[t.name + '_date']
        const timeField = props.item?.[t.name + '_time']
        if (dateField !== undefined || timeField !== undefined) {
          form.value[t.name + '_date'] = typeof dateField === 'string' ? dateField : ''
          form.value[t.name + '_time'] = typeof timeField === 'string' ? timeField : ''
        } else {
          const initialValue = props.item?.[t.name] ?? t.default
          const { date, time } = getLocalDateTimeParts(initialValue)
          if (date || time) {
            form.value[t.name + '_date'] = date
            form.value[t.name + '_time'] = time
          } else if (!props.item && t.options?.includes('isToday')) {
            form.value[t.name + '_date'] = formatLocalDate(now)
            form.value[t.name + '_time'] = formatLocalTime(now)
          } else {
            form.value[t.name + '_date'] = ''
            form.value[t.name + '_time'] = ''
          }
        }
      } else {
        if (props.item) {
          form.value[t.name] = props.item[t.name] ?? t.default ?? ''
        } else if (t.default !== undefined && t.default !== null) {
          form.value[t.name] = t.default
        } else if (t.type === 'DateType' && t.options?.includes('isToday')) {
          form.value[t.name] = formatLocalDate(now)
        } else if (t.type === 'time' && t.options?.includes('isToday')) {
          form.value[t.name] = formatLocalTime(now)
        } else {
          form.value[t.name] = t.type === 'boolean' ? false : ''
        }
      }
    })

    void nextTick(() => {
      isHydratingForm.value = false
    })
  }

  const requiredRule = (label: string) => (v: unknown) =>
    v !== null && v !== undefined && v !== '' ? true : `${label} ${t('global.isRequired')}`

  function getRules(template: EntityTemplate): Array<(v: unknown) => true | string> {
    const rules: Array<(v: unknown) => true | string> = []
    if (template.isRequired) {
      rules.push(requiredRule(t(`${props.entity?.handle}.${template.name}`)))
    }
    return rules
  }

  /**
   * Disables fields that must not be edited in the current dialog mode.
   */
  function isFieldDisabled(template: EntityTemplate): boolean {
    return (
      (template.name === 'handle' && props.mode === 'edit') ||
      template.options?.includes('isReadOnly') ||
      props.mode === 'readonly'
    )
  }

  function isReferenceFieldDisabled(template: EntityTemplate): boolean {
    return isFieldDisabled(template) || isReferenceDependencyBlocked(template)
  }

  /**
   * Synchronizes parent-bound relation defaults for create dialogs.
   */
  function syncParentReferences(): void {
    if (!props.parent || props.mode !== 'create') {
      return
    }

    templates.value
      .filter((template) => ['m:1', 'm:n', 'n:m'].includes(template.kind ?? ''))
      .forEach((template) => {
        if (template.referenceName !== props.parentEntity?.handle) {
          return
        }

        if (hasFormValue(form.value[template.name])) {
          return
        }

        form.value[template.name] = template.kind === 'm:1' ? props.parent : [props.parent]
      })
  }

  /**
   * Synchronizes the dialog visibility with the parent state.
   */
  function handleDialogUpdate(val: boolean): void {
    emit('update:modelValue', val)
  }

  /**
   * Loads the selected duplicate record with its references and reopens the dialog in edit mode.
   */
  async function onDuplicateSelect(item: SaplingGenericItem): Promise<void> {
    if (!item || item.handle == null) {
      return
    }

    const entityHandle = props.entity?.handle ?? ''
    const fullItemResult = await ApiGenericService.find<SaplingGenericItem>(entityHandle, {
      filter: { handle: item.handle },
      limit: 1,
      relations: ['m:1'],
    })

    emit('update:mode', 'edit')
    emit('update:modelValue', true)
    emit('update:item', fullItemResult.data[0] ?? null)
  }
  // #endregion

  // #region Lifecycle
  onMounted(initialize)

  watch(
    () => [props.item, props.mode],
    async () => {
      selectedItems.value = []
      await loadRelationTableItems()
    },
  )

  watch(
    () => props.templates,
    async () => {
      await initialize()
    },
    { deep: true },
  )

  watch(() => [props.item, props.mode, props.templates], initializeForm, {
    immediate: true,
    deep: true,
  })

  watch(
    () =>
      templates.value
        .filter((template) => template.referenceDependency)
        .map((template) => form.value[template.referenceDependency?.parentField ?? '']),
    () => {
      if (isHydratingForm.value) {
        return
      }

      templates.value
        .filter((template) => template.referenceDependency?.clearOnParentChange)
        .forEach((template) => {
          if (!isReferenceValueValidForDependency(template)) {
            form.value[template.name] = null
          }
        })
    },
    { deep: true },
  )

  watch(() => currentPersonStore.person, applyCurrentDefaults)

  watch(
    () => [props.parent, props.parentEntity, props.mode, props.templates],
    syncParentReferences,
    {
      immediate: true,
      deep: true,
    },
  )
  // #endregion

  // #region Permissions
  async function setEntitiesPermissions() {
    const currentPermissionStore = useCurrentPermissionStore() // Access the current permission store
    await currentPermissionStore.fetchCurrentPermission() // Fetch current permissions
    permissions.value = currentPermissionStore.accumulatedPermission // Set the permissions
  }
  // #region

  // #region Save
  async function submit(action: DialogSaveAction): Promise<void> {
    const result = await formRef.value?.validate()
    if (!isFormValid(result)) return

    const output = { ...form.value }

    if (props.mode === 'edit') {
      relationTemplates.value.forEach((t) => delete output[t.name])
    }

    // Dynamisch alle Datetime-Felder aus templates verarbeiten
    props.templates
      .filter((t) => t.type === 'datetime')
      .forEach((t) => {
        const key = t.name
        const dateValue = output[`${key}_date`]
        let date = ''
        if (dateValue instanceof Date) {
          date = formatLocalDate(dateValue)
        } else if (typeof dateValue === 'string') {
          date = dateValue
        }
        const time = output[`${key}_time`]

        const normalizedDateTime = toUtcIsoString(date, time)
        if (normalizedDateTime) {
          output[key] = normalizedDateTime
        }
        delete output[`${key}_date`]
        delete output[`${key}_time`]
      })

    // Anpassung für m:1-Relationen
    props.templates
      .filter((t) => ['m:1'].includes(t.kind ?? ''))
      .forEach((t) => {
        const val = form.value[t.name]
        if (val && typeof val === 'object') {
          const valObj = val as { [key: string]: unknown }
          const pkValues =
            t.referencedPks?.map((pk) => valObj[pk]).filter((v) => v !== undefined && v !== null) ??
            []

          if (pkValues.length === 1) {
            output[t.name] = pkValues[0]
          } else if (pkValues.length > 1) {
            output[t.name] = pkValues
          } else {
            output[t.name] = null
          }
        } else {
          output[t.name] = val ?? null
        }
      })

    if (props.mode === 'create') {
      props.templates
        .filter((t) => ['m:n', 'n:m'].includes(t.kind ?? ''))
        .forEach((t) => {
          const val = form.value[t.name]
          if (Array.isArray(val) && t.referencedPks) {
            // Für jedes Element im Array eine Liste der referencedPks erstellen und flach zusammenführen
            const pkValuesList = val
              .map((item) => {
                return t
                  .referencedPks!.map((pk) => item[pk])
                  .filter((v) => v !== undefined && v !== null)
              })
              .filter((arr) => arr.length > 0)
            output[t.name] = pkValuesList.flat()
          } else {
            output[t.name] = val ?? null
          }
        })
    }

    emit('save', output, action)
  }

  async function save(): Promise<void> {
    await submit('save')
  }

  async function saveAndClose(): Promise<void> {
    await submit('saveAndClose')
  }
  // #endregion

  // #region Cancel
  function cancel(): void {
    emit('update:modelValue', false)
    emit('cancel')
  }
  // #endregion

  // #region Return
  return {
    isLoading,
    form,
    formRef,
    activeTab,
    selectedRelations,
    visibleTemplates,
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
    permissions,
    iconNames,
    selectedItems,
    getRules,
    isFieldDisabled,
    isReferenceFieldDisabled,
    getReferenceParentFilter,
    getReferenceColumnsSync,
    fetchReferenceData,
    handleDialogUpdate,
    onDuplicateSelect,
    cancel,
    save,
    saveAndClose,
    addRelation,
    removeRelation,
    onRelationTablePage,
    onRelationTableItemsPerPage,
    onRelationTableSort,
    onRelationTableColumnFilters,
    onRelationTableReload,
  }
  // #endregion
}
