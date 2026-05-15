<template>
  <div class="sapling-kpi-widget sapling-kpi-sparkline">
    <v-skeleton-loader v-if="loading && !isLoaded" type="article" />

    <div v-else-if="hasError" class="sapling-kpi-widget__state sapling-kpi-widget__state--error">
      <v-icon size="20">mdi-alert-circle-outline</v-icon>
      <span>{{ $t('exception.unknownError') }}</span>
    </div>

    <div v-else-if="!hasData" class="sapling-kpi-widget__state">
      <v-icon size="20">mdi-database-off-outline</v-icon>
      <span>{{ $t('global.noData') }}</span>
    </div>

    <div v-else class="sapling-kpi-sparkline__content">
      <div class="sapling-kpi-sparkline__hero">
        <div class="sapling-kpi-sparkline__hero-copy">
          <span class="sapling-kpi-sparkline__eyebrow">{{ $t('kpi.latestPoint') }}</span>
          <h2 class="sapling-kpi-sparkline__headline">{{ lastValue }}</h2>
          <p class="sapling-kpi-sparkline__caption">{{ latestDrilldownLabel || lastLabel }}</p>
        </div>

        <v-chip
          variant="tonal"
          size="small"
          class="sapling-kpi-sparkline__delta"
          :color="deltaTone"
        >
          {{ deltaLabel }}
        </v-chip>
      </div>

      <div class="sapling-kpi-sparkline__stats">
        <div class="sapling-kpi-sparkline__stat">
          <span class="sapling-kpi-sparkline__stat-label">{{ $t('kpi.peak') }}</span>
          <strong>{{ peakValue }}</strong>
        </div>
        <div class="sapling-kpi-sparkline__stat">
          <span class="sapling-kpi-sparkline__stat-label">{{ $t('kpi.low') }}</span>
          <strong>{{ lowValue }}</strong>
        </div>
        <div class="sapling-kpi-sparkline__stat">
          <span class="sapling-kpi-sparkline__stat-label">{{ $t('kpi.average') }}</span>
          <strong>{{ averageValue }}</strong>
        </div>
      </div>

      <div class="sapling-kpi-sparkline__chart-shell">
        <div class="sapling-kpi-sparkline__chart-stage">
          <v-sparkline
            :auto-line-width="autoLineWidth"
            :fill="fill"
            :gradient="gradient"
            :gradient-direction="gradientDirection"
            :height="sparklineHeight"
            :line-width="width"
            :model-value="value"
            :padding="padding"
            :smooth="radius || false"
            :stroke-linecap="lineCap"
            :type="type"
            :width="sparklineWidth"
            class="sapling-kpi-sparkline__chart"
            auto-draw
          />

          <button
            v-for="item in sparklineMarkers"
            :key="item.entry.key"
            type="button"
            class="sapling-kpi-sparkline__marker"
            :style="item.style"
            @click="openDrilldown(item.index)"
          >
            <span class="sapling-kpi-sparkline__marker-dot" />
            <span class="sapling-kpi-sparkline__marker-copy glass-panel">
              <span class="sapling-kpi-sparkline__marker-label">{{ item.label }}</span>
              <strong class="sapling-kpi-sparkline__marker-value">{{ item.value }}</strong>
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
// #region Imports
import { useSaplingKpiSparkline } from '@/composables/kpi/useSaplingKpiSparkline'
import type { KPIItem } from '@/entity/entity'
import { computed, toRef, type CSSProperties } from 'vue'
// #endregion

interface SaplingKpiSparklineProps {
  kpi: KPIItem
}

// #region Props & Composable
const props = defineProps<SaplingKpiSparklineProps>()

const sparklineWidth = 300
const sparklineHeight = 75

const {
  width,
  radius,
  padding,
  lineCap,
  gradient,
  gradientDirection,
  fill,
  type,
  autoLineWidth,
  value,
  lastValue,
  lastLabel,
  deltaLabel,
  deltaTone,
  peakValue,
  lowValue,
  averageValue,
  latestDrilldownLabel,
  drilldownItems,
  loading,
  hasError,
  isLoaded,
  hasData,
  openDrilldown,
  loadKpiValue,
} = useSaplingKpiSparkline(toRef(props, 'kpi'))

function clamp(valueToClamp: number, minValue: number, maxValue: number) {
  return Math.min(Math.max(valueToClamp, minValue), maxValue)
}

const sparklineMarkers = computed(() => {
  const items = drilldownItems.value
  const numericValues = value.value

  if (items.length === 0 || numericValues.length === 0) {
    return []
  }

  const minValue = Math.min(...numericValues)
  const maxValue = Math.max(...numericValues)
  const minX = Number(padding)
  const maxX = sparklineWidth - Number(padding)
  const minY = Number(padding)
  const maxY = sparklineHeight - Number(padding)
  const totalValues = numericValues.length === 1 ? 2 : numericValues.length
  const gridX = (maxX - minX) / (totalValues - 1)
  const gridY = (maxY - minY) / (maxValue - minValue || 1)

  return items.map((item) => {
    const pointIndex = clamp(item.index, 0, numericValues.length - 1)
    const pointValue = numericValues[pointIndex] ?? item.value
    const pointX = minX + pointIndex * gridX
    const pointY = maxY - (pointValue - minValue) * gridY
    const style: CSSProperties = {
      left: `${(pointX / sparklineWidth) * 100}%`,
      top: `${(pointY / sparklineHeight) * 100}%`,
    }

    return {
      ...item,
      style,
    }
  })
})

defineExpose({ loadKpiValue, loading, hasError, hasData, isLoaded })
// #endregion
</script>
