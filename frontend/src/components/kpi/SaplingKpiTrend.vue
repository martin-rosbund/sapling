<template>
  <div class="sapling-kpi-widget sapling-kpi-trend">
    <v-skeleton-loader v-if="loading && !isLoaded" type="heading, text, text" />

    <div v-else-if="hasError" class="sapling-kpi-widget__state sapling-kpi-widget__state--error">
      <v-icon size="20">mdi-alert-circle-outline</v-icon>
      <span>{{ $t('exception.unknownError') }}</span>
    </div>

    <div v-else-if="!hasData" class="sapling-kpi-widget__state">
      <v-icon size="20">mdi-database-off-outline</v-icon>
      <span>{{ $t('global.noData') }}</span>
    </div>

    <div v-else class="sapling-kpi-trend__content">
      <div class="sapling-kpi-trend__hero">
        <div class="sapling-kpi-trend__signal">
          <v-icon :color="trendIcon.color" class="sapling-kpi-trend__signal-icon">{{ trendIcon.icon }}</v-icon>
          <span class="sapling-kpi-trend__signal-text">{{ trendMomentumLabel }}</span>
        </div>

        <div class="sapling-kpi-trend__values">
          <h1 class="sapling-kpi-trend__current">{{ value.current }}</h1>
          <div class="sapling-kpi-trend__summary">
            <v-chip :color="trendIcon.color" variant="tonal" size="small">{{ trendDeltaLabel }}</v-chip>
            <span v-if="trendPercentageLabel" class="sapling-kpi-trend__percentage">{{ trendPercentageLabel }}</span>
          </div>
          <h3 class="sapling-kpi-trend__previous">{{ $t('global.previous') }}: {{ value.previous }}</h3>
        </div>
      </div>

      <div class="sapling-kpi-trend__meter">
        <div class="sapling-kpi-trend__meter-row">
          <div class="sapling-kpi-trend__meter-head">
            <span class="sapling-kpi-trend__meter-label">Now</span>
            <strong>{{ value.current }}</strong>
          </div>
          <div class="sapling-kpi-trend__meter-track">
            <span class="sapling-kpi-trend__meter-fill sapling-kpi-trend__meter-fill--current" :style="{ width: `${currentRelativeWidth}%` }" />
          </div>
        </div>

        <div class="sapling-kpi-trend__meter-row">
          <div class="sapling-kpi-trend__meter-head">
            <span class="sapling-kpi-trend__meter-label">Prev</span>
            <strong>{{ value.previous }}</strong>
          </div>
          <div class="sapling-kpi-trend__meter-track">
            <span class="sapling-kpi-trend__meter-fill sapling-kpi-trend__meter-fill--previous" :style="{ width: `${previousRelativeWidth}%` }" />
          </div>
        </div>
      </div>

      <div v-if="canOpenCurrentDrilldown || canOpenPreviousDrilldown" class="sapling-kpi-trend__actions">
        <v-btn
          v-if="canOpenCurrentDrilldown"
          variant="text"
          size="small"
          class="sapling-kpi-trend__action"
          @click="openCurrentDrilldown"
        >
          {{ currentDrilldown?.label }}
        </v-btn>
        <v-btn
          v-if="canOpenPreviousDrilldown"
          variant="text"
          size="small"
          class="sapling-kpi-trend__action"
          @click="openPreviousDrilldown"
        >
          {{ previousDrilldown?.label }}
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
// #region Imports
import { useSaplingKpiTrend } from '@/composables/kpi/useSaplingKpiTrend';
import type { KPIItem } from '@/entity/entity';
import { toRef } from 'vue';
// #endregion

interface SaplingKpiTrendProps {
  kpi: KPIItem;
}

// #region Props & Composable
const props = defineProps<SaplingKpiTrendProps>();
const {
  value,
  loading,
  hasError,
  isLoaded,
  hasData,
  trendIcon,
  trendDeltaLabel,
  trendPercentageLabel,
  currentRelativeWidth,
  previousRelativeWidth,
  trendMomentumLabel,
  currentDrilldown,
  previousDrilldown,
  canOpenCurrentDrilldown,
  canOpenPreviousDrilldown,
  openCurrentDrilldown,
  openPreviousDrilldown,
  loadKpiValue,
} = useSaplingKpiTrend(toRef(props, 'kpi'));

defineExpose({ loadKpiValue, loading, hasError, hasData, isLoaded });
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingKpiTrend.css"></style>
