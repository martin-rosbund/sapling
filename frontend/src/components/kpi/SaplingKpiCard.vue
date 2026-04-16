<template>
  <v-card outlined class="sapling-kpi-card glass-panel tilt-content"
    v-tilt="TILT_DEFAULT_OPTIONS">
    <div class="sapling-kpi-card__header">
      <div class="sapling-kpi-card__headline">
        <div class="sapling-kpi-card__meta-row">
          <v-chip size="small" variant="tonal" color="primary">{{ kpiTypeLabel }}</v-chip>
        </div>

        <div class="sapling-kpi-card__title-row">
          <h3 class="sapling-kpi-card__title" :title="hasTruncatedTitle ? title : ''">{{ truncatedTitle }}</h3>
        </div>
      </div>

      <div class="sapling-kpi-card__header-tools">
        <v-btn-group density="compact" class="sapling-kpi-card__actions">
          <v-btn
            variant="text"
            class="sapling-kpi-card__action"
            :disabled="!canOpenEntity"
            :title="$t('kpi.openEntity')"
            @click.stop="openEntity"
          >
            <v-icon size="small">mdi-open-in-app</v-icon>
          </v-btn>
          <v-btn
            variant="text"
            class="sapling-kpi-card__action"
            :title="$t('kpi.refreshKpi')"
            @click.stop="refreshKpi"
          >
            <v-icon size="small">mdi-refresh</v-icon>
          </v-btn>
          <v-btn
            variant="text"
            class="sapling-kpi-card__action"
            :title="$t('kpi.removeKpi')"
            @click.stop="openKpiDeleteDialog"
          >
            <v-icon size="small">mdi-delete</v-icon>
          </v-btn>
        </v-btn-group>

        <div v-if="hasInfoTooltip" class="sapling-kpi-card__info-wrap">
          <v-tooltip location="top" max-width="360">
            <template #activator="{ props: tooltipProps }">
              <v-icon
                v-bind="tooltipProps"
                icon="mdi-information-outline"
                size="small"
                class="sapling-kpi-card__info-icon"
                color="grey"
              />
            </template>

            <div class="sapling-kpi-card__tooltip">
              <strong class="sapling-kpi-card__tooltip-title">{{ title }}</strong>
              <p v-if="description" class="sapling-kpi-card__tooltip-description">
                {{ description }}
              </p>
            </div>
          </v-tooltip>
        </div>
      </div>
    </div>

    <div class="sapling-kpi-card__body">
      <SaplingKpiBreakdown v-if="kpi && isBreakdownKpi" :ref="setRef" :kpi="kpi" />
      <SaplingKpiList v-else-if="kpi && isListKpi" :ref="setRef" :kpi="kpi" />
      <SaplingKpiItem v-else-if="kpi && isItemKpi" :ref="setRef" :kpi="kpi" />
      <SaplingKpiComparison v-else-if="kpi && isComparisonKpi" :ref="setRef" :kpi="kpi" />
      <SaplingKpiTrend v-else-if="kpi && isTrendKpi" :ref="setRef" :kpi="kpi" />
      <SaplingKpiSparkline v-else-if="kpi && isSparklineKpi" :ref="setRef" :kpi="kpi" />
      <div v-else class="sapling-kpi-card__unsupported">
        <v-icon size="28">mdi-chart-box-outline</v-icon>
        <span>{{ $t('kpi.unsupportedType') }}</span>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
// #region Imports
import SaplingKpiBreakdown from '@/components/kpi/SaplingKpiBreakdown.vue';
import SaplingKpiComparison from '@/components/kpi/SaplingKpiComparison.vue';
import SaplingKpiItem from '@/components/kpi/SaplingKpiItem.vue';
import SaplingKpiList from '@/components/kpi/SaplingKpiList.vue';
import SaplingKpiSparkline from '@/components/kpi/SaplingKpiSparkline.vue';
import SaplingKpiTrend from '@/components/kpi/SaplingKpiTrend.vue';
import { useSaplingKpiCard } from '@/composables/kpi/useSaplingKpiCard';
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants';
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
} = useSaplingKpiCard(props);
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingKpiCard.css"></style>
