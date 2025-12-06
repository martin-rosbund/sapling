<template>
  <div>
    <div v-if="loading" class="text-caption text-grey">Loading...</div>
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

const props = defineProps<{ kpi: any }>();

const data = ref<{ value: number; [key: string]: unknown }[]>([]);
const loading = ref(false);

async function loadKpiValue() {
  if (!props.kpi?.handle) return;
  loading.value = true;
  try {
    const result = await ApiService.findAll<{ value: { value: number; [key: string]: unknown }[] }>(`kpi/execute/${props.kpi.handle}`);
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