import { ref, type ComputedRef, type Ref } from 'vue'
import type { AccumulatedPermission, EntityTemplate } from '@/entity/structure'
import type { SaplingGenericItem } from '@/entity/entity'
import { useGenericStore } from '@/stores/genericStore'
import ApiGenericService, { type FilterQuery } from '@/services/api.generic.service'
import { isTextSearchableTemplate } from '@/utils/saplingTableUtil'

type DependencyComparableValue = string | number | boolean

interface UseSaplingDialogEditReferencesOptions {
  form: Ref<SaplingGenericItem>
  templates: ComputedRef<EntityTemplate[]>
  permissions: Ref<AccumulatedPermission[] | null>
  hasFormValue: (value: unknown) => boolean
}

export function useSaplingDialogEditReferences(options: UseSaplingDialogEditReferencesOptions) {
  const genericStore = useGenericStore()
  const referenceColumnsMap = ref<Record<string, EntityTemplate[]>>({})

  function getTemplateByName(name: string): EntityTemplate | undefined {
    return options.templates.value.find((template) => template.name === name)
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
      options.form.value[dependency.parentField],
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
    return (
      extractDependencyIdentifier(options.form.value[dependency.parentField], parentTemplate) ==
      null
    )
  }

  function isReferenceValueValidForDependency(template: EntityTemplate): boolean {
    const dependency = template.referenceDependency
    if (!dependency?.parentField || !dependency.targetField) {
      return true
    }

    const childValue = options.form.value[template.name]
    if (!options.hasFormValue(childValue)) {
      return true
    }

    const parentTemplate = getTemplateByName(dependency.parentField)
    const parentIdentifier = extractDependencyIdentifier(
      options.form.value[dependency.parentField],
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

  function getReferenceColumnsSync(template: EntityTemplate): EntityTemplate[] {
    const entityHandle = template.referenceName
    return referenceColumnsMap.value[entityHandle ?? ''] ?? []
  }

  function canReadReferenceEntity(referenceName?: string | null): boolean {
    const normalizedReferenceName = referenceName?.trim()
    if (!normalizedReferenceName) {
      return false
    }

    return Boolean(
      options.permissions.value?.find(
        (permission) => permission.entityHandle === normalizedReferenceName,
      )?.allowRead,
    )
  }

  async function ensureReferenceColumns(template: EntityTemplate): Promise<void> {
    const entityHandle = template.referenceName
    if (!canReadReferenceEntity(entityHandle)) {
      referenceColumnsMap.value[entityHandle ?? ''] = []
      return
    }

    if (!referenceColumnsMap.value[entityHandle ?? '']) {
      await genericStore.loadGeneric(entityHandle ?? '', 'global')
      const state = genericStore.getState(entityHandle ?? '')
      const templates = state.entityTemplates
      referenceColumnsMap.value[entityHandle ?? ''] = templates
        .filter(
          (entry) =>
            !entry.isAutoIncrement &&
            !entry.isReference &&
            !entry.options?.includes('isSecurity') &&
            !entry.options?.includes('isSystem'),
        )
        .map((entry) => ({ ...entry, key: entry.name }))
    }
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
        $or: columns.map((column) => ({ [column.key]: { $ilike: `%${search}%` } })),
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

  return {
    extractDependencyIdentifier,
    getReferenceParentFilter,
    isReferenceDependencyBlocked,
    isReferenceValueValidForDependency,
    getReferenceColumnsSync,
    canReadReferenceEntity,
    ensureReferenceColumns,
    fetchReferenceData,
  }
}
