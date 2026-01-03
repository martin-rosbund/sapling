<template>
  <div>
    <v-skeleton-loader v-if="loading" type="heading, text" class="mt-4 transparent" :loading="loading" height="48px" width="100%" />
    <div v-else class="d-flex align-center justify-space-between mt-4">
      <div>
        <span class="text-h2 font-weight-bold mr-2">{{ value.current }}</span>
        <span class="text-h5 ml-2">({{ $t('global.previous') }}: {{ value.previous }})</span>
      </div>
      <div>
        <v-icon :color="trendIcon.color" style="font-size: 3rem;">{{ trendIcon.icon }}</v-icon>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue';
import ApiService from '@/services/api.service';
import type { KpiTrendData, KpiTrendValue } from '../../entity/structure';
import { useKpiTrend } from '@/composables/kpi/useKpiTrend';

const props = defineProps<{ kpi: any }>();
const value = ref<KpiTrendValue>({ current: 0, previous: 0 });
const loading = ref(false);

const { trendIcon } = useKpiTrend(value);

async function loadKpiValue() {
  if (!props.kpi?.handle) return;
  loading.value = true;
  try {
    const result = await ApiService.findAll<KpiTrendData>(`kpi/execute/${props.kpi.handle}`);
    const val = result?.value;
    if (val && typeof val === 'object' && 'current' in val && 'previous' in val) {
      value.value = { current: val.current, previous: val.previous };
    } else {
      value.value = { current: 0, previous: 0 };
    }
  } catch {
    value.value = { current: 0, previous: 0 };
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
</script>
