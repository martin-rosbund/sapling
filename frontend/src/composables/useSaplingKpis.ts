import type { KPIItem } from '../entity/entity';

export interface DashboardTab {
  id: number;
  title: string;
  icon?: string;
  kpis: KPIItem[];
}

export function useSaplingKpis(
  userTabs: DashboardTab[],
  activeTab: number,
  openKpiDeleteDialog: (tabIdx: number, kpiIdx: number) => void,
  openAddKpiDialog: (tabIdx: number) => void,
  getKpiTableRows: (kpi: KPIItem) => Array<Record<string, any>>,
  getKpiTableColumns: (kpi: KPIItem) => string[],
  getKpiDisplayValue: (kpi: KPIItem) => string,
  getKpiTrendValue: (kpi: KPIItem) => { current: number; previous: number },
  getKpiSparklineData: (kpi: KPIItem) => Array<{ month: number; year: number; value: number }>
) {
  // All logic is passed in as props, so this composable simply exposes them for use in the component
  return {
    userTabs,
    activeTab,
    openKpiDeleteDialog,
    openAddKpiDialog,
    getKpiTableRows,
    getKpiTableColumns,
    getKpiDisplayValue,
    getKpiTrendValue,
    getKpiSparklineData,
  };
}
