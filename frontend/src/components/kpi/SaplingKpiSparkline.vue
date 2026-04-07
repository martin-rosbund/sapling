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
      <v-sparkline
        :auto-line-width="autoLineWidth"
        :fill="fill"
        :gradient="gradient"
        :gradient-direction="gradientDirection"
        :line-width="width"
        :model-value="value"
        :padding="padding"
        :smooth="radius || false"
        :stroke-linecap="lineCap"
        :type="type"
        class="sapling-kpi-sparkline__chart"
        auto-draw
      />
      <div class="sapling-kpi-sparkline__meta text-caption">
        <span v-if="firstLabel">{{ firstLabel }}: {{ firstValue }}</span>
        <span v-if="lastLabel">{{ lastLabel }}: {{ lastValue }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
// #region Imports
import { useSaplingKpiSparkline } from '@/composables/kpi/useSaplingKpiSparkline';
import type { KPIItem } from '@/entity/entity';
import { toRef } from 'vue';
// #endregion

interface SaplingKpiSparklineProps {
  kpi: KPIItem;
}

// #region Props & Composable
const props = defineProps<SaplingKpiSparklineProps>();

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
  firstValue,
  lastValue,
  firstLabel,
  lastLabel,
  loading,
  hasError,
  isLoaded,
  hasData,
  loadKpiValue,
} = useSaplingKpiSparkline(toRef(props, 'kpi'));

defineExpose({ loadKpiValue, loading, hasError, hasData, isLoaded });
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingKpiSparkline.css"></style>