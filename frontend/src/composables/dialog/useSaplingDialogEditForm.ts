import { nextTick, type ComputedRef, type Ref } from 'vue'
import type { DialogState, EntityTemplate } from '@/entity/structure'
import type { EntityItem, SaplingGenericItem } from '@/entity/entity'

interface UseSaplingDialogEditFormOptions {
  form: Ref<SaplingGenericItem>
  templates: ComputedRef<EntityTemplate[]>
  mode: ComputedRef<DialogState>
  item: ComputedRef<SaplingGenericItem | null>
  parent: ComputedRef<SaplingGenericItem | null | undefined>
  parentEntity: ComputedRef<EntityItem | null | undefined>
  relationTemplates: ComputedRef<EntityTemplate[]>
  currentPerson: ComputedRef<SaplingGenericItem | null | undefined>
  isHydratingForm: Ref<boolean>
  isLoading: Ref<boolean>
  initialFormSnapshot: Ref<Record<string, string>>
  hasFormValue: (value: unknown) => boolean
  syncInitialFormSnapshot: () => void
  formatLocalDate: (date: Date) => string
  formatLocalTime: (date: Date) => string
  getLocalDateTimeParts: (value: unknown) => { date: string; time: string }
  toUtcIsoString: (dateValue: unknown, timeValue: unknown) => string | null
}

export function useSaplingDialogEditForm(options: UseSaplingDialogEditFormOptions) {
  function getCurrentCompanyReference(): SaplingGenericItem | null {
    const company = options.currentPerson.value?.company

    if (!company) {
      return null
    }

    if (typeof company === 'object') {
      return company
    }

    return { handle: company }
  }

  function applyCurrentDefaults(): void {
    if (options.mode.value !== 'create' || options.item.value || !options.currentPerson.value) {
      return
    }

    const currentCompany = getCurrentCompanyReference()
    let didApplyDefaults = false

    options.templates.value
      .filter((template) => template.isReference && template.options?.includes('isCurrentPerson'))
      .forEach((template) => {
        if (options.form.value[template.name] == null || options.form.value[template.name] === '') {
          options.form.value[template.name] = options.currentPerson.value
          didApplyDefaults = true
        }
      })

    options.templates.value
      .filter((template) => template.isReference && template.options?.includes('isCurrentCompany'))
      .forEach((template) => {
        if (options.form.value[template.name] == null || options.form.value[template.name] === '') {
          options.form.value[template.name] = currentCompany
          didApplyDefaults = true
        }
      })

    if (didApplyDefaults && (options.isHydratingForm.value || options.isLoading.value)) {
      void nextTick(() => options.syncInitialFormSnapshot())
    }
  }

  function initializeForm(): void {
    const now = new Date()
    const currentCompany = getCurrentCompanyReference()

    options.isHydratingForm.value = true
    options.initialFormSnapshot.value = {}
    options.form.value = {}

    options.templates.value.forEach((template) => {
      if (template.isReference) {
        if (options.item.value) {
          const value = options.item.value[template.name]
          options.form.value[template.name] = value && typeof value === 'object' ? value : null
        } else if (template.options?.includes('isCurrentPerson') && options.currentPerson.value) {
          options.form.value[template.name] = options.currentPerson.value
        } else if (template.options?.includes('isCurrentCompany') && currentCompany) {
          options.form.value[template.name] = currentCompany
        } else {
          options.form.value[template.name] = null
        }
        return
      }

      if (template.type === 'datetime') {
        initializeDateTimeTemplate(template, now)
        return
      }

      initializeScalarTemplate(template, now)
    })

    void nextTick(() => {
      options.isHydratingForm.value = false
      options.syncInitialFormSnapshot()
    })
  }

  function initializeDateTimeTemplate(template: EntityTemplate, now: Date): void {
    const dateField = options.item.value?.[`${template.name}_date`]
    const timeField = options.item.value?.[`${template.name}_time`]

    if (dateField !== undefined || timeField !== undefined) {
      options.form.value[`${template.name}_date`] = typeof dateField === 'string' ? dateField : ''
      options.form.value[`${template.name}_time`] = typeof timeField === 'string' ? timeField : ''
      return
    }

    const initialValue = options.item.value?.[template.name] ?? template.default
    const { date, time } = options.getLocalDateTimeParts(initialValue)

    if (date || time) {
      options.form.value[`${template.name}_date`] = date
      options.form.value[`${template.name}_time`] = time
      return
    }

    if (!options.item.value && template.options?.includes('isToday')) {
      options.form.value[`${template.name}_date`] = options.formatLocalDate(now)
      options.form.value[`${template.name}_time`] = options.formatLocalTime(now)
      return
    }

    options.form.value[`${template.name}_date`] = ''
    options.form.value[`${template.name}_time`] = ''
  }

  function initializeScalarTemplate(template: EntityTemplate, now: Date): void {
    if (options.item.value) {
      options.form.value[template.name] =
        options.item.value[template.name] ?? template.default ?? ''
      return
    }

    if (template.default !== undefined && template.default !== null) {
      options.form.value[template.name] = template.default
      return
    }

    if (template.type === 'DateType' && template.options?.includes('isToday')) {
      options.form.value[template.name] = options.formatLocalDate(now)
      return
    }

    if (template.type === 'time' && template.options?.includes('isToday')) {
      options.form.value[template.name] = options.formatLocalTime(now)
      return
    }

    options.form.value[template.name] = template.type === 'boolean' ? false : ''
  }

  function syncParentReferences(): void {
    if (!options.parent.value || options.mode.value !== 'create') {
      return
    }

    let didSyncParentReferences = false

    options.templates.value
      .filter((template) => ['m:1', 'm:n', 'n:m'].includes(template.kind ?? ''))
      .forEach((template) => {
        if (template.referenceName !== options.parentEntity.value?.handle) {
          return
        }

        if (options.hasFormValue(options.form.value[template.name])) {
          return
        }

        options.form.value[template.name] =
          template.kind === 'm:1' ? options.parent.value : [options.parent.value]
        didSyncParentReferences = true
      })

    if (didSyncParentReferences && (options.isHydratingForm.value || options.isLoading.value)) {
      void nextTick(() => options.syncInitialFormSnapshot())
    }
  }

  function buildSavePayload(): SaplingGenericItem {
    const output = { ...options.form.value }

    if (options.mode.value === 'edit') {
      options.relationTemplates.value.forEach((template) => delete output[template.name])
    }

    options.templates.value
      .filter((template) => template.type === 'datetime')
      .forEach((template) => {
        const key = template.name
        const dateValue = output[`${key}_date`]
        const date =
          dateValue instanceof Date
            ? options.formatLocalDate(dateValue)
            : typeof dateValue === 'string'
              ? dateValue
              : ''
        const normalizedDateTime = options.toUtcIsoString(date, output[`${key}_time`])

        if (normalizedDateTime) {
          output[key] = normalizedDateTime
        }

        delete output[`${key}_date`]
        delete output[`${key}_time`]
      })

    options.templates.value
      .filter((template) => template.kind === 'm:1')
      .forEach((template) => {
        output[template.name] = normalizeSingleReferenceValue(
          options.form.value[template.name],
          template,
        )
      })

    if (options.mode.value === 'create') {
      options.templates.value
        .filter((template) => ['m:n', 'n:m'].includes(template.kind ?? ''))
        .forEach((template) => {
          output[template.name] = normalizeCollectionReferenceValue(
            options.form.value[template.name],
            template,
          )
        })
    }

    return output
  }

  function normalizeSingleReferenceValue(value: unknown, template: EntityTemplate): unknown {
    if (!value || typeof value !== 'object') {
      return value ?? null
    }

    const valueObject = value as Record<string, unknown>
    const pkValues =
      template.referencedPks
        ?.map((primaryKey) => valueObject[primaryKey])
        .filter((entry) => entry !== undefined && entry !== null) ?? []

    if (pkValues.length === 1) {
      return pkValues[0]
    }

    if (pkValues.length > 1) {
      return pkValues
    }

    return null
  }

  function normalizeCollectionReferenceValue(value: unknown, template: EntityTemplate): unknown {
    if (!Array.isArray(value) || !template.referencedPks) {
      return value ?? null
    }

    return value
      .map((entry) =>
        template
          .referencedPks!.map((primaryKey) => entry[primaryKey])
          .filter((primaryKeyValue) => primaryKeyValue !== undefined && primaryKeyValue !== null),
      )
      .filter((entry) => entry.length > 0)
      .flat()
  }

  return {
    applyCurrentDefaults,
    initializeForm,
    syncParentReferences,
    buildSavePayload,
  }
}
