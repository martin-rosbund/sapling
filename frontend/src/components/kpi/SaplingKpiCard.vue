<template>
  <v-card outlined class="sapling-kpi-card glass-panel">
    <div class="sapling-kpi-card__header">
      <div class="sapling-kpi-card__headline">
        <div class="sapling-kpi-card__meta-row">
          <v-chip size="small" variant="tonal" color="primary">{{ kpiTypeLabel }}</v-chip>
          <v-chip v-if="canOpenEntity" size="small" variant="text" prepend-icon="mdi-open-in-app">
            Drilldown
          </v-chip>
        </div>

        <h3 class="sapling-kpi-card__title" :title="kpi?.name || ''">{{ kpi?.name }}</h3>
        <p v-if="kpi?.description" class="sapling-kpi-card__description">
          {{ kpi.description }}
        </p>
      </div>

      <v-btn-group density="compact" class="sapling-kpi-card__actions">
        <v-btn
          variant="text"
          class="sapling-kpi-card__action"
          :disabled="!canOpenEntity"
          title="Open entity"
          @click.stop="openEntity"
        >
          <v-icon size="x-small">mdi-open-in-app</v-icon>
        </v-btn>
        <v-btn
          variant="text"
          class="sapling-kpi-card__action"
          title="Refresh KPI"
          @click.stop="refreshKpi"
        >
          <v-icon size="x-small">mdi-refresh</v-icon>
        </v-btn>
        <v-btn
          variant="text"
          class="sapling-kpi-card__action"
          title="Remove KPI"
          @click.stop="openKpiDeleteDialog"
        >
          <v-icon size="x-small">mdi-delete</v-icon>
        </v-btn>
      </v-btn-group>
    </div>

    <div class="sapling-kpi-card__body">
      <SaplingKpiList v-if="kpi && isListKpi" :ref="setRef" :kpi="kpi" />
      <SaplingKpiItem v-else-if="kpi && isItemKpi" :ref="setRef" :kpi="kpi" />
      <SaplingKpiTrend v-else-if="kpi && isTrendKpi" :ref="setRef" :kpi="kpi" />
      <SaplingKpiSparkline v-else-if="kpi && isSparklineKpi" :ref="setRef" :kpi="kpi" />
      <div v-else class="sapling-kpi-card__unsupported">
        <v-icon size="28">mdi-chart-box-outline</v-icon>
        <span>Unsupported KPI type</span>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
// #region Imports
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
  kpiTypeLabel,
  canOpenEntity,
  isListKpi,
  isItemKpi,
  isTrendKpi,
  isSparklineKpi,
} = useSaplingKpiCard(props);
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingKpiCard.css"></style>
