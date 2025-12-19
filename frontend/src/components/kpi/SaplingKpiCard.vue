<template>
  <v-card outlined class="sapling-kpi-card glass-panel tilt-content" v-tilt="TILT_DEFAULT_OPTIONS" style="min-height: 240px;">
    <v-card-title class="sapling-kpi-card-title d-flex align-center justify-space-between">
      <span>{{ kpi?.name }}</span>
      <v-btn-group>
        <v-btn icon="mdi-refresh" size="x-small" @click.stop="refreshKpi" class="transparent"/>
        <v-btn icon="mdi-delete" size="x-small" @click.stop="openKpiDeleteDialog" class="transparent"/>
      </v-btn-group>
    </v-card-title>
    <v-card-text class="sapling-kpi-card-text">
      <div class="sapling-kpi-description text-caption">{{ kpi?.description }}</div>
      <KpiList v-if="kpi?.type === 'LIST'" :ref="setRef" :kpi="kpi" />
      <KpiItem v-else-if="kpi?.type === 'ITEM'" :ref="setRef" :kpi="kpi" />
      <KpiTrend v-else-if="kpi?.type === 'TREND'" :ref="setRef" :kpi="kpi" />
      <KpiSparkline v-else-if="kpi?.type === 'SPARKLINE'" :ref="setRef" :kpi="kpi" />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants';
import KpiItem from '@/components/kpi/KpiItem.vue';
import KpiList from '@/components/kpi/KpiList.vue';
import KpiSparkline from '@/components/kpi/KpiSparkline.vue';
import KpiTrend from '@/components/kpi/KpiTrend.vue';
import { useKpiCard } from '@/composables/kpi/useSaplingKpiCard';
import type { KPIItem } from '@/entity/entity';

const props = defineProps<{
  kpi: KPIItem | null;
  kpiIdx: number;
  onDelete?: (idx: number) => void;
  onRefresh?: (idx: number) => void;
}>();

const { setRef, refreshKpi, openKpiDeleteDialog } = useKpiCard(props);
</script>
