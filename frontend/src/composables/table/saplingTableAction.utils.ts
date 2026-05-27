import type { EntityTemplate } from '@/entity/structure'
import type { SaplingGenericItem } from '@/entity/entity'

export function downloadJSONFile(data: unknown, filename: string) {
  downloadTextFile(JSON.stringify(data, null, 2), filename, 'application/json')
}

export function downloadTextFile(data: string, filename: string, type: string) {
  const blob = new Blob([data], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function isSupportedCsvFile(file: File): boolean {
  const normalizedName = file.name.toLowerCase()
  return (
    normalizedName.endsWith('.csv') ||
    normalizedName.endsWith('.txt') ||
    normalizedName.endsWith('.tsv') ||
    file.type === 'text/csv' ||
    file.type === 'text/plain'
  )
}

export function getItemHandle(item?: SaplingGenericItem | null) {
  if (!item || typeof item !== 'object') {
    return null
  }

  const { handle } = item
  return typeof handle === 'string' || typeof handle === 'number' ? handle : null
}

export function buildConcurrencyOptions(
  templates: EntityTemplate[],
  source: SaplingGenericItem | null,
) {
  return {
    expectedUpdatedAt: normalizeConcurrencyTimestamp(source?.updatedAt),
    basePayload: buildConcurrencyPayload(templates, source),
    resolution: 'detect' as const,
  }
}

export function normalizeConcurrencyTimestamp(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return null
  }

  const rawValue = String(value).trim()
  if (!rawValue) {
    return null
  }

  const parsedDate = new Date(rawValue)
  return Number.isNaN(parsedDate.getTime()) ? rawValue : parsedDate.toISOString()
}

export function buildConcurrencyPayload(
  templates: EntityTemplate[],
  source: SaplingGenericItem | null,
): Record<string, unknown> | null {
  if (!source) {
    return null
  }

  const payload: Record<string, unknown> = {}

  templates.filter(isConcurrencyComparableTemplate).forEach((template) => {
    if (!template.name || !Object.prototype.hasOwnProperty.call(source, template.name)) {
      return
    }

    payload[template.name] = normalizeConcurrencyPayloadValue(source[template.name], template)
  })

  return payload
}

export function normalizeConcurrencyPayloadValue(
  value: unknown,
  template: EntityTemplate,
): unknown {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }

  if (template.type === 'datetime' && typeof value === 'string') {
    return normalizeConcurrencyTimestamp(value) ?? value
  }

  return value ?? null
}

export function isConcurrencyComparableTemplate(template: EntityTemplate): boolean {
  if (!template.name || template.isPersistent === false) {
    return false
  }

  if (template.kind === 'm:1') {
    return true
  }

  if (template.isReference) {
    return false
  }

  return !['1:m', 'm:n', 'n:m', '1:1'].includes(template.kind ?? '')
}
