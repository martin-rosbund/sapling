<template>
  <div>
    <v-skeleton-loader v-if="loading" type="heading, text" class="mt-2 transparent" :loading="loading" height="105px" width="100%" />
    <template v-else>
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
  </div>
</template>

<script lang="ts" setup>
import { useKpiSparkline } from '@/composables/kpi/useKpiSparkline';

const props = defineProps<{ kpi: any }>();

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
  loadKpiValue,
} = useKpiSparkline(props.kpi);

defineExpose({ loadKpiValue });
</script>