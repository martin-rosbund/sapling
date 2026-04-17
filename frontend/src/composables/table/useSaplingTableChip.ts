import { computed } from 'vue'
import type { SaplingGenericItem } from '@/entity/entity'
import type { EntityTemplate } from '@/entity/structure'

type ReferenceValue = Record<string, unknown>

export interface UseSaplingTableChipProps {
  item: SaplingGenericItem
  col: EntityTemplate
  referenceTemplates?: EntityTemplate[]
}

/**
 * Resolves compact chip rendering for referenced m:1 values.
 */
export function useSaplingTableChip(props: UseSaplingTableChipProps) {
  const referenceValue = computed<ReferenceValue | undefined>(() => {
    const key = props.col.key
    if (!key) {
      return undefined
    }

    const value = props.item[key]
    return value && typeof value === 'object' ? (value as ReferenceValue) : undefined
  })

  const compactTemplate = computed(() =>
    props.referenceTemplates?.find((template) => template.options?.includes('isShowInCompact')),
  )

  const chipLabel = computed(() => {
    const template = compactTemplate.value
    const value = referenceValue.value
    if (!template?.name || !value) {
      return ''
    }

    const labelValue = value[template.name]
    return labelValue == null ? '' : String(labelValue)
  })

  const chipColor = computed(() => {
    const colorField = props.referenceTemplates?.find((template) =>
      template.options?.includes('isColor'),
    )?.name
    const value = referenceValue.value
    if (!colorField || !value?.[colorField]) {
      return undefined
    }

    return String(value[colorField])
  })

  const chipIcon = computed(() => {
    const iconField = props.referenceTemplates?.find((template) =>
      template.options?.includes('isIcon'),
    )?.name
    const value = referenceValue.value
    if (!iconField || !value?.[iconField]) {
      return ''
    }

    return String(value[iconField])
  })

  const hasChipIcon = computed(() => chipIcon.value.length > 0)
  const showChip = computed(() => Boolean(compactTemplate.value && chipLabel.value.length > 0))
  const isLoading = computed(() => !props.referenceTemplates)

  return {
    chipColor,
    chipIcon,
    chipLabel,
    hasChipIcon,
    showChip,
    isLoading,
  }
}
