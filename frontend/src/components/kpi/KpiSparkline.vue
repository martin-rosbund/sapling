<template>
  <div v-if="value.length === 0" class="text-caption text-grey">{{ $t('global.noData') }}</div>
  <div v-else>
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
      style="max-height: 105px;"
      auto-draw
    ></v-sparkline>
    <div class="d-flex justify-space-between mt-1 text-caption">
      <span v-if="firstLabel">{{ firstLabel }}: {{ firstValue }}</span>
      <span v-if="lastLabel">{{ lastLabel }}: {{ lastValue }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
// #region Imports
import { useKpiSparkline } from '@/composables/kpi/useKpiSparkline';
// #endregion

// #region Props
const props = defineProps<{ kpi: any }>();
// #endregion

// #region Composable
// Extrahiere Sparkline-Daten aus kpi
function getKpiSparklineData(kpi: any): { value: number; [key: string]: unknown }[] {
  const val = kpi?.value;
  if (Array.isArray(val)) {
    return val.filter(
      (d) => typeof d === 'object' && d !== null && 'value' in d
    ) as { value: number; [key: string]: unknown }[];
  }
  return [];
}

const data = getKpiSparklineData(props.kpi);
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
} = useKpiSparkline(data);
// #endregion
</script>