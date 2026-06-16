import { computed, ref, type Ref } from 'vue'
import type { SaplingGenericItem } from '@/entity/entity'
import type { EntityTemplate } from '@/entity/structure'
import { DEFAULT_ENTITY_ITEMS_COUNT } from '@/constants/project.constants'
import type { FilterQuery } from '@/services/api.generic.service'
import ApiGenericService from '@/services/api.generic.service'
import ApiTemplateService from '@/services/api.template.service'
import { i18n } from '@/i18n'
import { getEntityValueLabel } from '@/utils/saplingTableUtil'
import type {
  SaplingChipFilterGroup,
  SaplingChipFilterSelection,
  SaplingFilterHandle,
} from '@/components/filter/saplingWorkFilter.types'

const EMPTY_CHIP_FILTER_SENTINEL = '__sapling_empty_chip_filter__'

interface UseSaplingChipFiltersOptions {
  entityHandle: Readonly<Ref<string>>
  entityTemplates: Readonly<Ref<EntityTemplate[]>>
}

export function useSaplingChipFilters({
  entityHandle,
  entityTemplates,
}: UseSaplingChipFiltersOptions) {
  const chipFilters = ref<SaplingChipFilterGroup[]>([])
  const selectedChipFilters = ref<SaplingChipFilterSelection>({})
  let latestLoadRequestId = 0

  const selectedChipFilterCount = computed(() =>
    Object.values(selectedChipFilters.value).reduce((count, values) => count + values.length, 0),
  )

  async function loadChipFilters() {
    const currentRequestId = ++latestLoadRequestId
    const currentEntityHandle = entityHandle.value
    const currentEntityTemplates = [...entityTemplates.value]

    if (!currentEntityHandle) {
      clearChipFilters()
      return
    }

    const chipTemplates = currentEntityTemplates
      .filter(isChipFilterTemplate)
      .sort((left, right) => getChipFilterOrder(left) - getChipFilterOrder(right))

    const loadedFilters = await Promise.all(
      chipTemplates.map(async (template) => {
        const referenceName = template.referenceName ?? ''
        const referenceTemplates = await ApiTemplateService.getEntityTemplate(referenceName)
        const response = await ApiGenericService.find<SaplingGenericItem>(referenceName, {
          orderBy: buildReferenceOrderBy(referenceTemplates),
          limit: DEFAULT_ENTITY_ITEMS_COUNT,
        })
        const identifierKey = template.referencedPks?.[0] ?? 'handle'

        return {
          key: template.name,
          fieldName: template.name,
          referenceName,
          identifierKey,
          label: getTemplateLabel(currentEntityHandle, template),
          options: response.data
            .map((item) => buildChipFilterOption(item, identifierKey, referenceTemplates))
            .filter((option): option is NonNullable<typeof option> => option !== null),
        }
      }),
    )

    if (currentRequestId !== latestLoadRequestId || entityHandle.value !== currentEntityHandle) {
      return
    }

    chipFilters.value = loadedFilters.filter((filter) => filter.options.length > 0)
    selectedChipFilters.value = Object.fromEntries(
      chipFilters.value.map((filter) => [filter.key, getDefaultChipFilterHandles(filter)]),
    )
  }

  function clearChipFilters() {
    latestLoadRequestId += 1
    chipFilters.value = []
    selectedChipFilters.value = {}
  }

  function onSelectedChipFiltersUpdate(values: SaplingChipFilterSelection) {
    selectedChipFilters.value = Object.fromEntries(
      chipFilters.value.map((filter) => {
        const validHandles = new Set(filter.options.map((option) => option.handle))
        return [filter.key, (values[filter.key] ?? []).filter((value) => validHandles.has(value))]
      }),
    )
  }

  function buildChipFilterClauses(): FilterQuery[] {
    const clauses: FilterQuery[] = []

    chipFilters.value.forEach((filter) => {
      const selectedHandles = selectedChipFilters.value[filter.key] ?? []
      const allHandles = filter.options.map((option) => option.handle)

      if (isFullChipFilterSelection(selectedHandles, allHandles)) {
        return
      }

      const handles =
        selectedHandles.length > 0 ? selectedHandles : [EMPTY_CHIP_FILTER_SENTINEL]

      clauses.push({
        [filter.fieldName]: {
          [filter.identifierKey]: {
            $in: handles,
          },
        },
      })
    })

    return clauses
  }

  return {
    chipFilters,
    selectedChipFilters,
    selectedChipFilterCount,
    loadChipFilters,
    clearChipFilters,
    onSelectedChipFiltersUpdate,
    buildChipFilterClauses,
  }
}

function isChipFilterTemplate(template: EntityTemplate): boolean {
  return (
    template.isReference === true &&
    template.options?.includes('isChip') === true &&
    Boolean(template.referenceName) &&
    ['m:1', '1:1'].includes(template.kind ?? '')
  )
}

function getChipFilterOrder(template: EntityTemplate): number {
  return (
    template.formGroupOrder ??
    template.formOrder ??
    template.tableOrder ??
    Number.MAX_SAFE_INTEGER
  )
}

function getTemplateLabel(entityHandle: string, template: EntityTemplate): string {
  const configuredLabel = template.formConfig?.label?.trim()
  if (configuredLabel) {
    return configuredLabel
  }

  return i18n.global.t(`${entityHandle}.${template.name}`)
}

function buildReferenceOrderBy(referenceTemplates: EntityTemplate[]): Record<string, string> {
  const orderedTemplates = referenceTemplates.filter(
    (template) =>
      template.options?.includes('isOrderASC') || template.options?.includes('isOrderDESC'),
  )

  if (orderedTemplates.length > 0) {
    return Object.fromEntries(
      orderedTemplates.map((template) => [
        template.name,
        template.options?.includes('isOrderDESC') ? 'DESC' : 'ASC',
      ]),
    )
  }

  return Object.fromEntries(
    referenceTemplates
      .filter((template) => template.options?.includes('isValue'))
      .map((template) => [template.name, 'ASC']),
  )
}

function buildChipFilterOption(
  item: SaplingGenericItem,
  identifierKey: string,
  referenceTemplates: EntityTemplate[],
): SaplingChipFilterGroup['options'][number] | null {
  const handle = item[identifierKey]
  if (typeof handle !== 'string' && typeof handle !== 'number') {
    return null
  }

  const label = getEntityValueLabel(item, referenceTemplates) || String(handle)

  return {
    handle,
    label,
    color: getChipReferenceOptionValue(item, referenceTemplates, 'isColor'),
    icon: getChipReferenceOptionValue(item, referenceTemplates, 'isIcon'),
    isDefaultSelected: typeof item.isOpen === 'boolean' ? item.isOpen !== false : true,
  }
}

function getChipReferenceOptionValue(
  item: SaplingGenericItem,
  referenceTemplates: EntityTemplate[],
  option: 'isColor' | 'isIcon',
): string | undefined {
  const fieldName = referenceTemplates.find((template) => template.options?.includes(option))?.name
  const value = fieldName ? item[fieldName] : undefined
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function getDefaultChipFilterHandles(filter: SaplingChipFilterGroup): SaplingFilterHandle[] {
  const defaultHandles = filter.options
    .filter((option) => option.isDefaultSelected !== false)
    .map((option) => option.handle)

  return defaultHandles.length > 0 ? defaultHandles : filter.options.map((option) => option.handle)
}

function isFullChipFilterSelection(
  selectedHandles: SaplingFilterHandle[],
  allHandles: SaplingFilterHandle[],
): boolean {
  if (selectedHandles.length !== allHandles.length) {
    return false
  }

  const selectedHandleSet = new Set(selectedHandles)
  return allHandles.every((handle) => selectedHandleSet.has(handle))
}
