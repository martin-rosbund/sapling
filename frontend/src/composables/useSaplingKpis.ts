import { onMounted, ref } from 'vue';
import ApiService from '@/services/api.service';
import ApiGenericService from '@/services/api.generic.service';
import type { KPIItem, DashboardItem } from '../entity/entity';

export interface DashboardTab {
  id: number;
  title: string;
  icon?: string;
  kpis: KPIItem[];
}

export function useSaplingKpis(userTabs: DashboardTab[], dashboards: DashboardItem[]) {
  // KPI State
  const kpiFormRef = ref<InstanceType<typeof HTMLFormElement> | null>(null);
  const kpiDeleteDialog = ref(false);
  const kpiToDelete = ref<KPIItem | null>(null);
  const kpiDeleteTabIdx = ref<number | null>(null);
  const kpiDeleteKpiIdx = ref<number | null>(null);
  const addKpiDialog = ref(false);
  const selectedKpi = ref<KPIItem | null>(null);
  const kpiTabIdx = ref<number | null>(null);
  const availableKpis = ref<KPIItem[]>([]);
  type KpiValueType = number | null | Record<string, unknown> | Array<unknown>;
  const kpiValues = ref<Record<string | number, KpiValueType>>({});
  const kpiLoading = ref<Record<string | number, boolean>>({});
  const kpiAbortControllers = ref<Record<string | number, AbortController>>({});

  onMounted(() => {
    loadAllKpiValues();
  });
  
  // Methods
  async function validateAndAddKpi() {
    const valid = await kpiFormRef.value?.validate();
    if (valid) {
      addKpiToTab();
    }
  }

  function openKpiDeleteDialog(tabIdx: number, kpiIdx: number) {
    kpiDeleteTabIdx.value = tabIdx;
    kpiDeleteKpiIdx.value = kpiIdx;
    kpiToDelete.value = userTabs[tabIdx]?.kpis[kpiIdx] || null;
    kpiDeleteDialog.value = true;
  }

  async function confirmKpiDelete() {
    if (
      kpiDeleteTabIdx.value !== null &&
      kpiDeleteKpiIdx.value !== null &&
      kpiToDelete.value &&
      kpiToDelete.value.handle
    ) {
      await ApiGenericService.delete('kpi', { handle: kpiToDelete.value.handle });
      userTabs[kpiDeleteTabIdx.value]?.kpis.splice(kpiDeleteKpiIdx.value, 1);
    }
    kpiDeleteDialog.value = false;
    kpiToDelete.value = null;
    kpiDeleteTabIdx.value = null;
    kpiDeleteKpiIdx.value = null;
  }

  function cancelKpiDelete() {
    kpiDeleteDialog.value = false;
    kpiToDelete.value = null;
    kpiDeleteTabIdx.value = null;
    kpiDeleteKpiIdx.value = null;
  }

  async function openAddKpiDialog(tabIdx: number) {
    kpiTabIdx.value = tabIdx;
    selectedKpi.value = null;
    // Lade verfügbare KPIs, wenn Dialog geöffnet wird
    const res = await ApiGenericService.find<KPIItem>('kpi');
    availableKpis.value = res.data || [];
    addKpiDialog.value = true;
  }

  function addKpiToTab() {
    if (
      typeof kpiTabIdx.value === 'number' &&
      selectedKpi.value &&
      Array.isArray(dashboards) &&
      dashboards.length > kpiTabIdx.value &&
      Array.isArray(userTabs) &&
      userTabs.length > kpiTabIdx.value
    ) {
      const dashboardHandle = dashboards[kpiTabIdx.value]?.handle;
      ApiGenericService.create('kpi', {
        ...selectedKpi.value,
        dashboards: dashboardHandle ? [dashboardHandle] : [],
      }).then((createdKpi) => {
        const tab = typeof kpiTabIdx.value === 'number' ? userTabs[kpiTabIdx.value] : undefined;
        if (tab && Array.isArray(tab.kpis)) {
          (tab.kpis as KPIItem[]).push(createdKpi as KPIItem);
        }
        addKpiDialog.value = false;
        loadKpiValue(createdKpi as KPIItem);
      });
    }
  }

  function loadKpiValue(kpi: KPIItem) {
    if (!kpi.handle) return;
    if (kpiLoading.value[kpi.handle]) return;
    kpiLoading.value[kpi.handle] = true;
    const controller = new AbortController();
    kpiAbortControllers.value[kpi.handle] = controller;
    ApiService.findAll<{ value: KpiValueType }>(`kpi/execute/${kpi.handle}`)
      .then((result) => {
        if (kpi.handle != null) {
          kpiValues.value[String(kpi.handle)] = result && 'value' in result ? result.value as KpiValueType : null;
        }
      })
      .catch(() => {
        if (kpi.handle != null) {
          kpiValues.value[String(kpi.handle)] = null;
        }
      })
      .finally(() => {
        if (kpi.handle != null) {
          kpiLoading.value[String(kpi.handle)] = false;
          delete kpiAbortControllers.value[String(kpi.handle)];
        }
      });
  }

  function loadAllKpiValues() {
    const allKpis = userTabs.flatMap(tab => tab.kpis);
    allKpis.forEach(kpi => {
      if (kpi.handle) loadKpiValue(kpi);
    });
  }

  function getKpiDisplayValue(kpi: KPIItem): string {
    if (!kpi.handle) return '—';
    if (kpiLoading.value[kpi.handle]) return '…';
    const val = kpiValues.value[kpi.handle];
    if (kpi.type === 'LIST') {
      return '';
    }
    if (val === null || val === undefined) return '—';
    if (typeof val === 'object' && val !== null) {
      // Für Trend/Sparkline/Objektanzeige ggf. anpassen
      if ('current' in val && 'previous' in val) {
        return `${(val as Record<string, unknown>).current}`;
      }
      return JSON.stringify(val);
    }
    return String(val);
  }

  function getKpiTableRows(kpi: KPIItem): Array<Record<string, unknown>> {
    if (!kpi.handle) return [];
    const val = kpiValues.value[kpi.handle];
    if (kpi.type === 'LIST' && Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
      return val as Array<Record<string, unknown>>;
    }
    return [];
  }

  function getKpiTableColumns(kpi: KPIItem): string[] {
    const rows = getKpiTableRows(kpi);
    if (rows.length > 0 && rows[0]) {
      return Object.keys(rows[0]);
    }
    return [];
  }

  function getKpiSparklineData(kpi: KPIItem): Array<{ month: number, year: number, value: number }> {
    if (!kpi.handle) return [];
    const val = kpiValues.value[kpi.handle];
    if (Array.isArray(val) && val.length > 0 && val[0] && typeof val[0] === 'object' && 'month' in val[0] && 'year' in val[0] && 'value' in val[0]) {
      return val as Array<{ month: number, year: number, value: number }>;
    }
    return [];
  }

  function getKpiTrendValue(kpi: KPIItem): { current: number, previous: number } {
    if (!kpi.handle) return { current: 0, previous: 0 };
    const val = kpiValues.value[kpi.handle];
    if (
      val &&
      typeof val === 'object' &&
      val !== null &&
      'current' in val &&
      'previous' in val &&
      typeof (val as Record<string, unknown>).current === 'number' &&
      typeof (val as Record<string, unknown>).previous === 'number'
    ) {
      return {
        current: Number((val as Record<string, unknown>).current),
        previous: Number((val as Record<string, unknown>).previous)
      };
    }
    return { current: 0, previous: 0 };
  }

  return {
    kpiFormRef,
    kpiDeleteDialog,
    kpiToDelete,
    kpiDeleteTabIdx,
    kpiDeleteKpiIdx,
    addKpiDialog,
    selectedKpi,
    kpiTabIdx,
    availableKpis,
    kpiValues,
    kpiLoading,
    kpiAbortControllers,
    validateAndAddKpi,
    openKpiDeleteDialog,
    confirmKpiDelete,
    cancelKpiDelete,
    openAddKpiDialog,
    addKpiToTab,
    loadKpiValue,
    getKpiDisplayValue,
    getKpiTableRows,
    getKpiTableColumns,
    getKpiSparklineData,
    getKpiTrendValue,
  };
}
