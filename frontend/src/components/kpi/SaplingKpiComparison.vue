<template>
  <div class="sapling-kpi-widget sapling-kpi-comparison">
    <v-skeleton-loader v-if="loading && !isLoaded" type="heading, text, article" />

    <div v-else-if="hasError" class="sapling-kpi-widget__state sapling-kpi-widget__state--error">
      <v-icon size="20">mdi-alert-circle-outline</v-icon>
      <span>{{ $t('exception.unknownError') }}</span>
    </div>

    <div v-else-if="!hasData" class="sapling-kpi-widget__state">
      <v-icon size="20">mdi-database-off-outline</v-icon>
      <span>{{ $t('global.noData') }}</span>
    </div>

    <div v-else class="sapling-kpi-comparison__content">
      <div class="sapling-kpi-comparison__delta">
        <v-icon :color="trendIcon.color" size="28">{{ trendIcon.icon }}</v-icon>
        <div>
          <h2 class="sapling-kpi-comparison__delta-value">{{ trendDeltaLabel }}</h2>
          <p v-if="trendPercentageLabel" class="sapling-kpi-comparison__delta-text">{{ trendPercentageLabel }}</p>
        </div>
      </div>

      <div class="sapling-kpi-comparison__stats">
        <div class="sapling-kpi-comparison__stat">
          <span class="sapling-kpi-comparison__label">Current</span>
          <strong class="sapling-kpi-comparison__value">{{ value.current }}</strong>
          <v-btn
            v-if="canOpenCurrentDrilldown"
            variant="text"
            size="small"
            class="sapling-kpi-comparison__action"
            @click="openCurrentDrilldown"
          >
            {{ currentDrilldown?.label }}
          </v-btn>
        </div>

        <div class="sapling-kpi-comparison__stat">
          <span class="sapling-kpi-comparison__label">Previous</span>
          <strong class="sapling-kpi-comparison__value">{{ value.previous }}</strong>
          <v-btn
            v-if="canOpenPreviousDrilldown"
            variant="text"
            size="small"
            class="sapling-kpi-comparison__action"
            @click="openPreviousDrilldown"
          >
            {{ previousDrilldown?.label }}
          </v-btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useSaplingKpiTrend } from '@/composables/kpi/useSaplingKpiTrend';
import type { KPIItem } from '@/entity/entity';
import { toRef } from 'vue';

interface SaplingKpiComparisonProps {
  kpi: KPIItem;
}

const props = defineProps<SaplingKpiComparisonProps>();
const {
  value,
  loading,
  hasError,
  isLoaded,
  hasData,
  trendIcon,
  trendDeltaLabel,
  trendPercentageLabel,
  currentDrilldown,
  previousDrilldown,
  canOpenCurrentDrilldown,
  canOpenPreviousDrilldown,
  openCurrentDrilldown,
  openPreviousDrilldown,
  loadKpiValue,
} = useSaplingKpiTrend(toRef(props, 'kpi'));

defineExpose({ loadKpiValue, loading, hasError, hasData, isLoaded });
</script>

<style scoped src="@/assets/styles/SaplingKpiComparison.css"></style>