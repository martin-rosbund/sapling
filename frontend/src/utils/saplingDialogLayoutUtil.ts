import type { EntityTemplate, EntityTemplateFormWidth } from '@/entity/structure'

export type SaplingDialogColumnProps = {
  cols: 12
  sm: 12
  md: 6 | 12
  lg: 3 | 6 | 9 | 12
}

export type SaplingDialogTemplateGroup = {
  id: string
  key: string | null
  label: string | null
  templates: EntityTemplate[]
}

const DEFAULT_GROUP_ID = '__default__'

function normalizeFormGroup(group?: string | null): string | null {
  const normalizedGroup = group?.trim() ?? ''
  return normalizedGroup.length > 0 ? normalizedGroup : null
}

function normalizeFormOrder(order?: number | null): number | null {
  return typeof order === 'number' && Number.isFinite(order) ? Math.trunc(order) : null
}

function normalizeFormGroupOrder(order?: number | null): number | null {
  return typeof order === 'number' && Number.isFinite(order) ? Math.trunc(order) : null
}

function normalizeFormWidth(width?: number | null): EntityTemplateFormWidth | null {
  if (typeof width !== 'number' || !Number.isFinite(width)) {
    return null
  }

  const normalizedWidth = Math.max(1, Math.min(4, Math.trunc(width)))
  return normalizedWidth as EntityTemplateFormWidth
}

function getNormalizedType(template: EntityTemplate): string {
  return String(template.type ?? '').toLowerCase()
}

function getDefaultDialogWidth(template: EntityTemplate): EntityTemplateFormWidth {
  const normalizedType = getNormalizedType(template)

  if (
    template.options?.includes('isMarkdown') ||
    normalizedType === 'jsontype' ||
    (template.length ?? 0) > 128
  ) {
    return 4
  }

  if (normalizedType === 'boolean') {
    return 1
  }

  return 2
}

export function getDialogTemplateWidth(template: EntityTemplate): EntityTemplateFormWidth {
  return normalizeFormWidth(template.formWidth) ?? getDefaultDialogWidth(template)
}

export function getDialogTemplateOrder(template: EntityTemplate, index: number): number {
  return normalizeFormOrder(template.formOrder) ?? index
}

export function sortDialogTemplates(templates: EntityTemplate[]): EntityTemplate[] {
  return [...templates]
    .map((template, index) => ({
      template,
      index,
      order: normalizeFormOrder(template.formOrder),
    }))
    .sort((left, right) => {
      if (left.order != null && right.order != null) {
        if (left.order === right.order) {
          return left.index - right.index
        }

        return left.order - right.order
      }

      if (left.order != null) {
        return -1
      }

      if (right.order != null) {
        return 1
      }

      if (left.index === right.index) {
        return left.index - right.index
      }

      return left.index - right.index
    })
    .map(({ template }) => template)
}

export function groupDialogTemplates(
  templates: EntityTemplate[],
  resolveGroupLabel?: (groupKey: string) => string,
): SaplingDialogTemplateGroup[] {
  const groups = new Map<
    string,
    SaplingDialogTemplateGroup & { groupOrder: number | null; firstIndex: number }
  >()

  templates.forEach((template, index) => {
    const groupKey = normalizeFormGroup(template.formGroup)
    const groupId = groupKey ?? DEFAULT_GROUP_ID
    const groupOrder = normalizeFormGroupOrder(template.formGroupOrder)

    if (!groups.has(groupId)) {
      groups.set(groupId, {
        id: groupId,
        key: groupKey,
        label: groupKey ? (resolveGroupLabel?.(groupKey) ?? groupKey) : null,
        templates: [],
        groupOrder,
        firstIndex: index,
      })
    }

    const group = groups.get(groupId)
    if (!group) {
      return
    }

    group.templates.push(template)

    if (group.groupOrder == null && groupOrder != null) {
      group.groupOrder = groupOrder
    }
  })

  return [...groups.values()]
    .sort((left, right) => {
      if (left.groupOrder != null && right.groupOrder != null) {
        if (left.groupOrder === right.groupOrder) {
          return left.firstIndex - right.firstIndex
        }

        return left.groupOrder - right.groupOrder
      }

      if (left.groupOrder != null) {
        return -1
      }

      if (right.groupOrder != null) {
        return 1
      }

      return left.firstIndex - right.firstIndex
    })
    .map((group) => ({
      id: group.id,
      key: group.key,
      label: group.label,
      templates: group.templates,
    }))
}

export function getDialogTemplateColumns(template: EntityTemplate): SaplingDialogColumnProps {
  const width = getDialogTemplateWidth(template)
  const largeColumnsByWidth: Record<EntityTemplateFormWidth, SaplingDialogColumnProps['lg']> = {
    1: 3,
    2: 6,
    3: 9,
    4: 12,
  }

  return {
    cols: 12,
    sm: 12,
    md: width >= 3 ? 12 : 6,
    lg: largeColumnsByWidth[width],
  }
}
