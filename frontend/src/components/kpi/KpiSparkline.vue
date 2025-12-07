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
import { ref, onMounted, watch } from 'vue';
import ApiService from '@/services/api.service';
import { useKpiSparkline } from '@/composables/kpi/useKpiSparkline';
import type { KpiSparklineData, KpiSparklineValue } from '@/entity/structure';

const props = defineProps<{ kpi: any }>();

const data = ref<KpiSparklineValue[]>([]);
const loading = ref(false);

async function loadKpiValue() {
  if (!props.kpi?.handle) return;
  loading.value = true;
  try {
    const result = await ApiService.findAll<KpiSparklineData>(`kpi/execute/${props.kpi.handle}`);
    const val = result?.value ?? [];
    if (Array.isArray(val)) {
      data.value = val.filter((d) => typeof d === 'object' && d !== null && 'value' in d);
    } else {
      data.value = [];
    }
  } catch {
    data.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadKpiValue();
});

defineExpose({ loadKpiValue });

watch(() => props.kpi?.handle, (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) loadKpiValue();
});

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
</script>