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

    <div
      v-else
      class="sapling-kpi-comparison__content"
      :class="`sapling-kpi-comparison__content--${trendText}`"
    >
      <div class="sapling-kpi-comparison__header">
        <div class="sapling-kpi-comparison__headline">
          <span class="sapling-kpi-comparison__eyebrow">{{ trendLeadLabel }}</span>
          <h2 class="sapling-kpi-comparison__delta-value">{{ trendDeltaLabel }}</h2>
          <p class="sapling-kpi-comparison__delta-text">
            {{ trendPercentageLabel }}
          </p>
        </div>
        <div class="sapling-kpi-comparison__badge">
          <v-icon :color="trendIcon.color" size="20">{{ trendIcon.icon }}</v-icon>
          <span>{{ trendLeadCaption }}</span>
        </div>
      </div>

      <div class="sapling-kpi-comparison__arena">
        <component
          :is="canOpenCurrentDrilldown ? 'button' : 'div'"
          type="button"
          class="sapling-kpi-comparison__stat"
          :class="{ 'sapling-kpi-comparison__stat--clickable': canOpenCurrentDrilldown }"
          @click="canOpenCurrentDrilldown ? openCurrentDrilldown() : undefined"
        >
          <span class="sapling-kpi-comparison__label">{{ $t('kpi.current') }}</span>
          <strong class="sapling-kpi-comparison__value">{{ value.current }}</strong>
          <span class="sapling-kpi-comparison__share">{{ currentShareLabel }}</span>
          <span v-if="currentDrilldown?.label" class="sapling-kpi-comparison__drilldown">{{
            currentDrilldown.label
          }}</span>
        </component>

        <div class="sapling-kpi-comparison__versus glass-panel">{{ $t('kpi.versus') }}</div>

        <component
          :is="canOpenPreviousDrilldown ? 'button' : 'div'"
          type="button"
          class="sapling-kpi-comparison__stat"
          :class="{ 'sapling-kpi-comparison__stat--clickable': canOpenPreviousDrilldown }"
          @click="canOpenPreviousDrilldown ? openPreviousDrilldown() : undefined"
        >
          <span class="sapling-kpi-comparison__label">{{ $t('kpi.previous') }}</span>
          <strong class="sapling-kpi-comparison__value">{{ value.previous }}</strong>
          <span class="sapling-kpi-comparison__share">{{ previousShareLabel }}</span>
          <span v-if="previousDrilldown?.label" class="sapling-kpi-comparison__drilldown">{{
            previousDrilldown.label
          }}</span>
        </component>
      </div>

      <div class="sapling-kpi-comparison__balance">
        <span
          class="sapling-kpi-comparison__balance-fill sapling-kpi-comparison__balance-fill--current"
          :style="{ width: `${currentShare}%` }"
        />
        <span
          class="sapling-kpi-comparison__balance-fill sapling-kpi-comparison__balance-fill--previous"
          :style="{ width: `${previousShare}%` }"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useSaplingKpiTrend } from '@/composables/kpi/useSaplingKpiTrend'
import type { KPIItem } from '@/entity/entity'
import { toRef } from 'vue'

interface SaplingKpiComparisonProps {
  kpi: KPIItem
}

const props = defineProps<SaplingKpiComparisonProps>()
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
} = useSaplingKpiTrend(toRef(props, 'kpi'))

defineExpose({ loadKpiValue, loading, hasError, hasData, isLoaded })
</script>
