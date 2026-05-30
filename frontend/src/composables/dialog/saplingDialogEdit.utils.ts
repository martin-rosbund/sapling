import type {
  EntityTemplate,
  SaplingFormConfigPayload,
  SaplingFormFieldConfig,
} from '@/entity/structure'
import type { SaplingGenericItem } from '@/entity/entity'
import type { SaplingFormConfigItem } from '@/services/api.form-config.service'

export type VuetifyFormValidationResult = boolean | { valid: boolean } | undefined
export type FormConfigSelectionHandle = number | null

export interface FormConfigMenuItem {
  handle: FormConfigSelectionHandle
  title: string
  icon: string
  active: boolean
}

export function getItemHandle(item?: SaplingGenericItem | null): string | number | null {
  if (!item || typeof item !== 'object') {
    return null
  }

  const { handle } = item
  return typeof handle === 'string' || typeof handle === 'number' ? handle : null
}

export function isFormValid(result: VuetifyFormValidationResult): boolean {
  if (typeof result === 'boolean') {
    return result
  }

  return result?.valid === true
}

export function hasFormValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0
  }

  return value !== null && value !== undefined && value !== ''
}

export function applyFormConfigOverlay(
  sourceTemplates: EntityTemplate[],
  config: SaplingFormConfigPayload | null,
): EntityTemplate[] {
  if (!config?.fields) {
    return sourceTemplates
  }

  return sourceTemplates.map((template) => {
    const fieldConfig = getFieldConfig(config.fields?.[template.name])
    if (!fieldConfig) {
      return template
    }

    return {
      ...template,
      formGroup: fieldConfig.group ?? template.formGroup,
      formGroupOrder: fieldConfig.groupOrder ?? template.formGroupOrder,
      formOrder: fieldConfig.order ?? template.formOrder,
      formWidth: fieldConfig.width ?? template.formWidth,
      formVisible: fieldConfig.visible ?? template.formVisible,
      tableOrder: fieldConfig.tableOrder ?? template.tableOrder,
      tableVisible: fieldConfig.tableVisible ?? template.tableVisible,
      mobileOrder: fieldConfig.mobileOrder ?? template.mobileOrder,
      mobileVisible: fieldConfig.mobileVisible ?? template.mobileVisible,
      isRequired: fieldConfig.required ?? template.isRequired,
      formConfig: {
        ...(template.formConfig ?? {}),
        ...fieldConfig,
      },
    }
  })
}

export function getDefaultFormConfigHandle(
  configs: SaplingFormConfigItem[],
): FormConfigSelectionHandle {
  return (
    configs.find(
      (config) =>
        config.isActive !== false && config.isDefault && typeof config.handle === 'number',
    )?.handle ?? null
  )
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatLocalTime(date: Date): string {
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${hours}:${minutes}`
}

export function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime())
}

export function getLocalDateTimeParts(value: unknown): { date: string; time: string } {
  if (value instanceof Date) {
    return isValidDate(value)
      ? { date: formatLocalDate(value), time: formatLocalTime(value) }
      : { date: '', time: '' }
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return { date: '', time: '' }
  }

  const rawValue = String(value).trim()
  if (!rawValue) {
    return { date: '', time: '' }
  }

  const parsedDate = new Date(rawValue)
  if (isValidDate(parsedDate)) {
    return {
      date: formatLocalDate(parsedDate),
      time: formatLocalTime(parsedDate),
    }
  }

  const [date = '', time = ''] = rawValue.split('T')
  return {
    date,
    time: time.slice(0, 5),
  }
}

export function toUtcIsoString(dateValue: unknown, timeValue: unknown): string | null {
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

function getFieldConfig(value: unknown): SaplingFormFieldConfig | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as SaplingFormFieldConfig)
    : null
}
