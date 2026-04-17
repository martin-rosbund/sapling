import type { SaplingKpiCardProps } from '@/components/kpi/SaplingKpiCard.vue'
import type { KPIItem } from '@/entity/entity'
import { getKpiTargetEntityHandle, navigateToKpiEntity } from '@/utils/saplingKpiNavigation'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { computed, ref, type ComponentPublicInstance } from 'vue'

const KPI_TYPE_LABEL_KEYS: Record<string, string> = {
  LIST: 'kpi.typeList',
  ITEM: 'kpi.typeItem',
  TREND: 'kpi.typeTrend',
  SPARKLINE: 'kpi.typeSparkline',
  BREAKDOWN: 'kpi.typeBreakdown',
  COMPARISON: 'kpi.typeComparison',
}

function resolveHandleLabel(value: { handle?: string } | string | null | undefined): string | null {
  const rawValue =
    typeof value === 'string' ? value : typeof value?.handle === 'string' ? value.handle : null

  if (!rawValue) {
    return null
  }

  return rawValue
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export interface SaplingKpiCardContentRef {
  loadKpiValue: () => Promise<void> | void
}

function resolveKpiTypeHandle(type: KPIItem['type'] | null | undefined): string | null {
  if (typeof type === 'string' && type.length > 0) {
    return type
  }

  if (
    type &&
    typeof type === 'object' &&
    typeof type.handle === 'string' &&
    type.handle.length > 0
  ) {
    return type.handle
  }

  return null
}

function isKpiCardContentRef(value: unknown): value is SaplingKpiCardContentRef {
  return (
    value !== null &&
    typeof value === 'object' &&
    'loadKpiValue' in value &&
    typeof value.loadKpiValue === 'function'
  )
}

function truncateTitle(value: string | null | undefined, limit = 50): string {
  if (!value) {
    return ''
  }

  return value.length > limit ? `${value.slice(0, limit)}...` : value
}

/**
 * Encapsulates all interaction logic for a single KPI dashboard card.
 */
export function useSaplingKpiCard(props: SaplingKpiCardProps) {
  //#region State
  const router = useRouter()
  const { t } = useI18n()
  const kpiRef = ref<SaplingKpiCardContentRef | null>(null)
  const kpiTypeHandle = computed(() => resolveKpiTypeHandle(props.kpi?.type))
  const kpiTypeLabel = computed(() => {
    const currentTypeHandle = kpiTypeHandle.value
    const translationKey = KPI_TYPE_LABEL_KEYS[currentTypeHandle ?? ''] ?? 'kpi.typeCustom'
    const translatedLabel = t(translationKey)

    if (translatedLabel !== translationKey) {
      return translatedLabel
    }

    return resolveHandleLabel(currentTypeHandle) ?? translatedLabel
  })
  const aggregationLabel = computed(() => resolveHandleLabel(props.kpi?.aggregation))
  const timeframeLabel = computed(() => {
    const timeframe = resolveHandleLabel(props.kpi?.timeframe ?? null)
    const interval = resolveHandleLabel(props.kpi?.timeframeInterval ?? null)

    if (!timeframe) {
      return null
    }

    return interval ? `${timeframe} / ${interval}` : timeframe
  })
  const title = computed(() => props.kpi?.name ?? '')
  const truncatedTitle = computed(() => truncateTitle(title.value))
  const hasTruncatedTitle = computed(() => title.value.length > 30)
  const description = computed(() => props.kpi?.description?.trim() ?? '')
  const hasInfoTooltip = computed(() => title.value.length > 0 || description.value.length > 0)
  const targetEntityLabel = computed(() =>
    resolveHandleLabel(getKpiTargetEntityHandle(props.kpi?.targetEntity ?? null)),
  )
  const canOpenEntity = computed(() =>
    Boolean(getKpiTargetEntityHandle(props.kpi?.targetEntity ?? null)),
  )
  const isListKpi = computed(() => kpiTypeHandle.value === 'LIST')
  const isBreakdownKpi = computed(() => kpiTypeHandle.value === 'BREAKDOWN')
  const isItemKpi = computed(() => kpiTypeHandle.value === 'ITEM')
  const isTrendKpi = computed(() => kpiTypeHandle.value === 'TREND')
  const isComparisonKpi = computed(() => kpiTypeHandle.value === 'COMPARISON')
  const isSparklineKpi = computed(() => kpiTypeHandle.value === 'SPARKLINE')
  //#endregion

  //#region Methods
  /**
   * Stores the exposed child instance so the card can trigger a manual refresh.
   */
  function setRef(el: Element | ComponentPublicInstance | null) {
    kpiRef.value = isKpiCardContentRef(el) ? el : null
  }

  /**
   * Refreshes the current KPI widget and notifies the parent dashboard if required.
   */
  async function refreshKpi() {
    await kpiRef.value?.loadKpiValue?.()
    props.onRefresh?.(props.kpiIdx)
  }

  /**
   * Opens the delete flow for the KPI card.
   */
  function openKpiDeleteDialog() {
    props.onDelete?.(props.kpiIdx)
  }

  /**
   * Navigates to the configured target entity of the KPI.
   */
  function openEntity() {
    navigateToKpiEntity(props.kpi, undefined, (path) => {
      void router.push(path)
    })
  }
  //#endregion

  //#region Return
  return {
    setRef,
    refreshKpi,
    openEntity,
    openKpiDeleteDialog,
    title,
    truncatedTitle,
    hasTruncatedTitle,
    description,
    hasInfoTooltip,
    kpiTypeLabel,
    aggregationLabel,
    timeframeLabel,
    targetEntityLabel,
    canOpenEntity,
    isListKpi,
    isBreakdownKpi,
    isItemKpi,
    isTrendKpi,
    isComparisonKpi,
    isSparklineKpi,
  }
  //#endregion
}
