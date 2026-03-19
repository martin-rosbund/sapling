<template>
  <div style="max-height: 145px; overflow-y: auto;">
    <v-skeleton-loader v-if="loading" type="article"/>
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
import { useSaplingKpiSparkline } from '@/composables/kpi/useSaplingKpiSparkline';
import type { KPIItem } from '@/entity/entity';

const props = defineProps<{ kpi: KPIItem }>();

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
} = useSaplingKpiSparkline(props.kpi);

defineExpose({ loadKpiValue });
</script>