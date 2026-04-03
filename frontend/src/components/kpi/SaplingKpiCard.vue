<template>
  <v-card outlined class="glass-panel tilt-content" v-tilt="TILT_DEFAULT_OPTIONS" style="min-height: 240px;">
    <v-card-title class="d-flex align-center justify-space-between">
      <span style="max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" v-tooltip="kpi?.name">{{ kpi?.name }}</span>
      <v-btn-group density="compact" style="gap: 2px;">
        <v-btn @click.stop="openEntity" variant="text" style="min-width: 28px; padding: 0 4px;">
          <v-icon size="x-small">mdi-open-in-app</v-icon>
        </v-btn>
        <v-btn @click.stop="refreshKpi" variant="text" style="min-width: 28px; padding: 0 4px;">
          <v-icon size="x-small">mdi-refresh</v-icon>
        </v-btn>
        <v-btn @click.stop="openKpiDeleteDialog" variant="text" style="min-width: 28px; padding: 0 4px;">
          <v-icon size="x-small">mdi-delete</v-icon>
        </v-btn>
      </v-btn-group>
    </v-card-title>
    <v-card-text>
      <div class="sapling-kpi-description text-caption">{{ kpi?.description }}</div>
      <SaplingKpiList v-if="kpi && isListKpi" :ref="setRef" :kpi="kpi" />
      <SaplingKpiItem v-else-if="kpi && isItemKpi" :ref="setRef" :kpi="kpi" />
      <SaplingKpiTrend v-else-if="kpi && isTrendKpi" :ref="setRef" :kpi="kpi" />
      <SaplingKpiSparkline v-else-if="kpi && isSparklineKpi" :ref="setRef" :kpi="kpi" />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
// #region Imports
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants';
import SaplingKpiItem from '@/components/kpi/SaplingKpiItem.vue';
import SaplingKpiList from '@/components/kpi/SaplingKpiList.vue';
import SaplingKpiSparkline from '@/components/kpi/SaplingKpiSparkline.vue';
import SaplingKpiTrend from '@/components/kpi/SaplingKpiTrend.vue';
import { useSaplingKpiCard } from '@/composables/kpi/useSaplingKpiCard';
import type { KPIItem } from '@/entity/entity';
// #endregion

/**
 * Props for a single KPI dashboard tile.
 */
export interface SaplingKpiCardProps {
  kpi: KPIItem | null;
  kpiIdx: number;
  onDelete?: (idx: number) => void;
  onRefresh?: (idx: number) => void;
}

// #region Props & Composable
const props = defineProps<SaplingKpiCardProps>();

const {
  setRef,
  refreshKpi,
  openKpiDeleteDialog,
  openEntity,
  isListKpi,
  isItemKpi,
  isTrendKpi,
  isSparklineKpi,
} = useSaplingKpiCard(props);
// #endregion
</script>
