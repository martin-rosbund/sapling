import type { SaplingKpiCardProps } from '@/components/kpi/SaplingKpiCard.vue';
import type { KPIItem } from '@/entity/entity';
import { navigateToKpiEntity } from '@/utils/saplingKpiNavigation';
import { computed, ref, type ComponentPublicInstance } from 'vue';

export interface SaplingKpiCardContentRef {
  loadKpiValue: () => Promise<void> | void;
}

function resolveKpiTypeHandle(type: KPIItem['type'] | null | undefined): string | null {
  if (typeof type === 'string' && type.length > 0) {
    return type;
  }

  if (type && typeof type === 'object' && typeof type.handle === 'string' && type.handle.length > 0) {
    return type.handle;
  }

  return null;
}

function isKpiCardContentRef(value: unknown): value is SaplingKpiCardContentRef {
  return value !== null
    && typeof value === 'object'
    && 'loadKpiValue' in value
    && typeof value.loadKpiValue === 'function';
}

/**
 * Encapsulates all interaction logic for a single KPI dashboard card.
 */
export function useSaplingKpiCard(props: SaplingKpiCardProps) {
  //#region State
  const kpiRef = ref<SaplingKpiCardContentRef | null>(null);
  const kpiTypeHandle = computed(() => resolveKpiTypeHandle(props.kpi?.type));
  const isListKpi = computed(() => kpiTypeHandle.value === 'LIST');
  const isItemKpi = computed(() => kpiTypeHandle.value === 'ITEM');
  const isTrendKpi = computed(() => kpiTypeHandle.value === 'TREND');
  const isSparklineKpi = computed(() => kpiTypeHandle.value === 'SPARKLINE');
  //#endregion

  //#region Methods
  /**
   * Stores the exposed child instance so the card can trigger a manual refresh.
   */
  function setRef(el: Element | ComponentPublicInstance | null) {
    kpiRef.value = isKpiCardContentRef(el) ? el : null;
  }

  /**
   * Refreshes the current KPI widget and notifies the parent dashboard if required.
   */
  async function refreshKpi() {
    await kpiRef.value?.loadKpiValue?.();
    props.onRefresh?.(props.kpiIdx);
  }

  /**
   * Opens the delete flow for the KPI card.
   */
  function openKpiDeleteDialog() {
    props.onDelete?.(props.kpiIdx);
  }

  /**
   * Navigates to the configured target entity of the KPI.
   */
  function openEntity() {
    navigateToKpiEntity(props.kpi);
  }
  //#endregion

  //#region Return
  return {
    setRef,
    refreshKpi,
    openEntity,
    openKpiDeleteDialog,
    isListKpi,
    isItemKpi,
    isTrendKpi,
    isSparklineKpi,
  };
  //#endregion
}
