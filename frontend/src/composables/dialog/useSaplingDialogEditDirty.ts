import { computed, type ComputedRef, type Ref } from 'vue'
import type { EntityTemplate } from '@/entity/structure'
import type { SaplingGenericItem } from '@/entity/entity'

interface UseSaplingDialogEditDirtyOptions {
  form: Ref<SaplingGenericItem>
  templates: ComputedRef<EntityTemplate[]>
  initialFormSnapshot: Ref<Record<string, string>>
  forceDirty?: ComputedRef<boolean>
  extractDependencyIdentifier: (
    value: unknown,
    template?: EntityTemplate,
  ) => string | number | boolean | Record<string, unknown> | null
  formatLocalDate: (date: Date) => string
  formatLocalTime: (date: Date) => string
  isValidDate: (date: Date) => boolean
}

export function useSaplingDialogEditDirty(options: UseSaplingDialogEditDirtyOptions) {
  function normalizeNumberValue(value: unknown): number | string | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null
    }

    if (typeof value !== 'string') {
      return value == null ? null : String(value)
    }

    const trimmedValue = value.trim()
    if (!trimmedValue) {
      return null
    }

    const numericValue = Number(trimmedValue)
    return Number.isNaN(numericValue) ? trimmedValue : numericValue
  }

  function normalizeDateOnly(value: unknown): string | null {
    if (value instanceof Date) {
      return options.isValidDate(value) ? options.formatLocalDate(value) : null
    }

    if (typeof value !== 'string') {
      return value == null ? null : String(value)
    }

    const trimmedValue = value.trim()
    return trimmedValue || null
  }

  function normalizeTimeOnly(value: unknown): string | null {
    if (value instanceof Date) {
      return options.isValidDate(value) ? options.formatLocalTime(value) : null
    }

    if (typeof value !== 'string') {
      return value == null ? null : String(value)
    }

    const trimmedValue = value.trim()
    return trimmedValue || null
  }

  function compareComparableValues(left: unknown, right: unknown): number {
    return JSON.stringify(left).localeCompare(JSON.stringify(right))
  }

  function normalizeComparableValue(value: unknown): unknown {
    if (value instanceof Date) {
      return options.isValidDate(value) ? value.toISOString() : null
    }

    if (Array.isArray(value)) {
      return [...value]
        .map((entry) => normalizeComparableValue(entry))
        .sort(compareComparableValues)
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .filter(([, entryValue]) => entryValue !== undefined)
          .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
          .map(([key, entryValue]) => [key, normalizeComparableValue(entryValue)]),
      )
    }

    return value ?? null
  }

  function normalizeReferenceValue(value: unknown, template: EntityTemplate): unknown {
    if (Array.isArray(value)) {
      return [...value]
        .map((entry) => normalizeReferenceValue(entry, template))
        .filter((entry) => entry != null)
        .sort(compareComparableValues)
    }

    if (!value || typeof value !== 'object') {
      return normalizeComparableValue(value)
    }

    const identifier = options.extractDependencyIdentifier(value, template)
    if (identifier != null) {
      return normalizeComparableValue(identifier)
    }

    return normalizeComparableValue(value)
  }

  function serializeComparableValue(value: unknown): string {
    return JSON.stringify(value)
  }

  function createTemplateComparisonToken(
    template: EntityTemplate,
    source: SaplingGenericItem = options.form.value,
  ): string {
    if (template.type === 'datetime') {
      return serializeComparableValue({
        date: normalizeDateOnly(source[`${template.name}_date`]),
        time: normalizeTimeOnly(source[`${template.name}_time`]),
      })
    }

    if (
      template.type === 'number' ||
      template.options?.includes('isPercent') ||
      template.options?.includes('isMoney')
    ) {
      return serializeComparableValue(normalizeNumberValue(source[template.name]))
    }

    if (template.type === 'boolean') {
      return serializeComparableValue(Boolean(source[template.name]))
    }

    if (template.type === 'DateType') {
      return serializeComparableValue(normalizeDateOnly(source[template.name]))
    }

    if (template.type === 'time') {
      return serializeComparableValue(normalizeTimeOnly(source[template.name]))
    }

    if (template.type === 'JsonType') {
      return serializeComparableValue(
        normalizeComparableValue(
          typeof source[template.name] === 'string' ? null : source[template.name],
        ),
      )
    }

    if (template.isReference || ['1:m', 'm:1', 'm:n', 'n:m'].includes(template.kind ?? '')) {
      return serializeComparableValue(normalizeReferenceValue(source[template.name], template))
    }

    return serializeComparableValue(normalizeComparableValue(source[template.name]))
  }

  function createFormComparisonSnapshot(
    source: SaplingGenericItem = options.form.value,
  ): Record<string, string> {
    return Object.fromEntries(
      options.templates.value.map((template) => [
        template.name,
        createTemplateComparisonToken(template, source),
      ]),
    )
  }

  function syncInitialFormSnapshot(): void {
    options.initialFormSnapshot.value = createFormComparisonSnapshot(options.form.value)
  }

  const currentFormSnapshot = computed(() => createFormComparisonSnapshot(options.form.value))

  const dirtyTemplateNames = computed(() => {
    if (Object.keys(options.initialFormSnapshot.value).length === 0) {
      return []
    }

    return options.templates.value
      .filter(
        (template) =>
          options.initialFormSnapshot.value[template.name] !==
          currentFormSnapshot.value[template.name],
      )
      .map((template) => template.name)
  })

  const dirtyTemplateNameSet = computed(() => new Set(dirtyTemplateNames.value))
  const dirtyFieldCount = computed(() => dirtyTemplateNames.value.length)
  const isDirty = computed(() => (options.forceDirty?.value ? true : dirtyFieldCount.value > 0))

  function isTemplateDirty(template: EntityTemplate): boolean {
    return dirtyTemplateNameSet.value.has(template.name)
  }

  function getDirtyTemplateCount(templatesToCheck: EntityTemplate[]): number {
    return templatesToCheck.filter((template) => isTemplateDirty(template)).length
  }

  return {
    syncInitialFormSnapshot,
    isDirty,
    dirtyFieldCount,
    isTemplateDirty,
    getDirtyTemplateCount,
  }
}
