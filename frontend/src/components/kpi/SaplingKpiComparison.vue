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

    <div v-else class="sapling-kpi-comparison__content" :class="`sapling-kpi-comparison__content--${trendText}`">
      <div class="sapling-kpi-comparison__header">
        <div class="sapling-kpi-comparison__headline">
          <span class="sapling-kpi-comparison__eyebrow">{{ trendLeadLabel }}</span>
          <h2 class="sapling-kpi-comparison__delta-value">{{ trendDeltaLabel }}</h2>
          <p class="sapling-kpi-comparison__delta-text">
            {{ trendPercentageLabel || trendLeadCaption }}
          </p>
        </div>
        <div class="sapling-kpi-comparison__badge">
          <v-icon :color="trendIcon.color" size="20">{{ trendIcon.icon }}</v-icon>
          <span>{{ trendLeadCaption }}</span>
        </div>
      </div>

      <div class="sapling-kpi-comparison__arena">
        <div class="sapling-kpi-comparison__stat">
          <span class="sapling-kpi-comparison__label">Current</span>
          <strong class="sapling-kpi-comparison__value">{{ value.current }}</strong>
          <span class="sapling-kpi-comparison__share">{{ currentShareLabel }}</span>
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

        <div class="sapling-kpi-comparison__versus">VS</div>

        <div class="sapling-kpi-comparison__stat">
          <span class="sapling-kpi-comparison__label">Previous</span>
          <strong class="sapling-kpi-comparison__value">{{ value.previous }}</strong>
          <span class="sapling-kpi-comparison__share">{{ previousShareLabel }}</span>
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

      <div class="sapling-kpi-comparison__balance">
        <span class="sapling-kpi-comparison__balance-fill sapling-kpi-comparison__balance-fill--current" :style="{ width: `${currentShare}%` }" />
        <span class="sapling-kpi-comparison__balance-fill sapling-kpi-comparison__balance-fill--previous" :style="{ width: `${previousShare}%` }" />
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
  trendText,
  trendDeltaLabel,
  trendPercentageLabel,
  currentShare,
  previousShare,
  currentShareLabel,
  previousShareLabel,
  trendLeadLabel,
  trendLeadCaption,
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