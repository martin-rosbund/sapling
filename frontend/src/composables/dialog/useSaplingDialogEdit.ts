// #region Imports
import { ref, watch, onMounted, computed, nextTick, type ComputedRef, type Ref } from 'vue'
import type {
  AccumulatedPermission,
  DialogSaveAction,
  DialogState,
  EntityTemplate,
} from '@/entity/structure'
import ApiGenericService from '@/services/api.generic.service'
import { useI18n } from 'vue-i18n'
import type { EntityItem, SaplingGenericItem } from '@/entity/entity'
import { mdiIcons } from '@/constants/mdi.icons'
import { getEditDialogHeaders } from '@/utils/saplingTableUtil'
import {
  getDialogTemplateColumns,
  groupDialogTemplates,
  sortDialogTemplates,
} from '@/utils/saplingDialogLayoutUtil'
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import { useSaplingDialogEditDirty } from './useSaplingDialogEditDirty'
import { useSaplingDialogEditForm } from './useSaplingDialogEditForm'
import { useSaplingDialogEditRelations } from './useSaplingDialogEditRelations'
import { useSaplingDialogEditReferences } from './useSaplingDialogEditReferences'
// #endregion

// #region Types
type VuetifyFormValidationResult = boolean | { valid: boolean } | undefined

type VuetifyFormRef = {
  validate: () => Promise<VuetifyFormValidationResult>
  resetValidation?: () => void
}

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
  options?: { forceDirty?: ComputedRef<boolean> },
) {
  // #region State
  const { t, te } = useI18n()
  const templates = computed(() => props.templates ?? [])
  const showReference = computed(() => props.showReference !== false)
  const isLoading = ref(true)
  const form: Ref<SaplingGenericItem> = ref({})
  const formRef: Ref<VuetifyFormRef | null> = ref(null)
  const activeTab = ref(0)
  const permissions = ref<AccumulatedPermission[] | null>(null)
  const currentPersonStore = useCurrentPersonStore()
  const iconNames = mdiIcons
  const isHydratingForm = ref(false)
  const initialFormSnapshot = ref<Record<string, string>>({})
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

  // #region Templates
  const visibleTemplates = computed(() =>
    sortDialogTemplates(
      getEditDialogHeaders(
        templates.value,
        props.mode,
        showReference.value,
        permissions.value || [],
      ),
    ),
  )

  function translateDialogGroupLabel(groupKey: string): string {
    const normalizedGroupKey = groupKey.trim()
    const entityHandle = props.entity?.handle?.trim() ?? ''

    const translationKey = entityHandle
      ? [
          `${entityHandle}.dialogGroup.${normalizedGroupKey}`,
          `${entityHandle}.${normalizedGroupKey}`,
        ].find((key) => te(key))
      : null

    return translationKey ? t(translationKey) : normalizedGroupKey
  }

  const visibleTemplateGroups = computed(() =>
    groupDialogTemplates(visibleTemplates.value, translateDialogGroupLabel),
  )

  const {
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
    ensureRelationTableItems,
    onRelationTablePage,
    onRelationTableItemsPerPage,
    onRelationTableSort,
    onRelationTableColumnFilters,
    onRelationTableReload,
    clearSelectedItems,
    resetRelationTableItems,
    resetRelationSelections,
  } = useSaplingDialogEditRelations({
    entity: computed(() => props.entity),
    item: computed(() => props.item),
    mode: computed(() => props.mode),
    permissions,
    showReference,
    templates,
    t,
    getItemHandle,
  })

  const {
    extractDependencyIdentifier,
    getReferenceParentFilter,
    isReferenceDependencyBlocked,
    isReferenceValueValidForDependency,
    getReferenceColumnsSync,
    canReadReferenceEntity,
    prefetchReferenceColumns,
    fetchReferenceData,
  } = useSaplingDialogEditReferences({
    form,
    templates,
    permissions,
    hasFormValue,
  })

  const {
    syncInitialFormSnapshot,
    isDirty,
    dirtyFieldCount,
    isTemplateDirty,
    getDirtyTemplateCount,
  } = useSaplingDialogEditDirty({
    form,
    templates,
    initialFormSnapshot,
    forceDirty: options?.forceDirty,
    extractDependencyIdentifier,
    formatLocalDate,
    formatLocalTime,
    isValidDate,
  })

  const { applyCurrentDefaults, initializeForm, syncParentReferences, buildSavePayload } =
    useSaplingDialogEditForm({
      form,
      templates,
      mode: computed(() => props.mode),
      item: computed(() => props.item),
      parent: computed(() => props.parent),
      parentEntity: computed(() => props.parentEntity),
      relationTemplates,
      currentPerson: computed(() => currentPersonStore.person),
      isHydratingForm,
      isLoading,
      initialFormSnapshot,
      hasFormValue,
      syncInitialFormSnapshot,
      formatLocalDate,
      formatLocalTime,
      getLocalDateTimeParts,
      toUtcIsoString,
    })
  // #endregion

  function getTemplateColumnProps(template: EntityTemplate) {
    return getDialogTemplateColumns(template)
  }

  async function initialize() {
    isLoading.value = true

    try {
      await currentPersonStore.fetchCurrentPerson()
      await setEntitiesPermissions()
      await initializeRelationTables()
      await loadActiveRelationTableItems()
    } catch (error) {
      console.error('Error initializing dialog edit:', error)
    } finally {
      isLoading.value = false
      void nextTick(() => {
        void prefetchReferenceColumns(
          templates.value.filter(
            (template) => template.isReference && canReadReferenceEntity(template.referenceName),
          ),
        )
      })
    }
  }

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

  async function loadActiveRelationTableItems(): Promise<void> {
    if (props.mode !== 'edit') {
      return
    }

    const activeRelationTemplate = relationTemplates.value[activeTab.value - 1]
    if (!activeRelationTemplate) {
      return
    }

    await ensureRelationTableItems(activeRelationTemplate.name)
  }
  // #endregion

  // #region Lifecycle
  onMounted(initialize)

  watch(
    () => [props.item, props.mode],
    async () => {
      clearSelectedItems()
      resetRelationTableItems()
      await loadActiveRelationTableItems()
    },
  )

  watch(activeTab, () => {
    void loadActiveRelationTableItems()
  })

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
    if (!isDirty.value) {
      return
    }

    const result = await formRef.value?.validate()
    if (!isFormValid(result)) return

    const output = buildSavePayload()
    emit('save', output, action)
  }

  /*

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

  */

  async function save(): Promise<void> {
    if (!isDirty.value) {
      return
    }

    await submit('save')
  }

  async function saveAndClose(): Promise<void> {
    if (!isDirty.value) {
      return
    }

    await submit('saveAndClose')
  }
  // #endregion

  // #region Reset
  function resetForm(): void {
    if (!isDirty.value) {
      return
    }

    resetRelationSelections()
    activeTab.value = 0
    initializeForm()

    void nextTick(() => {
      formRef.value?.resetValidation?.()
    })
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
    visibleTemplateGroups,
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
    isDirty,
    dirtyFieldCount,
    getRules,
    getTemplateColumnProps,
    isTemplateDirty,
    getDirtyTemplateCount,
    isFieldDisabled,
    isReferenceFieldDisabled,
    getReferenceParentFilter,
    getReferenceColumnsSync,
    fetchReferenceData,
    handleDialogUpdate,
    onDuplicateSelect,
    cancel,
    resetForm,
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
