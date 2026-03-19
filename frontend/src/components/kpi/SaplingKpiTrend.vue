<template>
  <div style="max-height: 145px; overflow-y: auto;">
    <v-skeleton-loader v-if="loading" type="heading, text, text"/>
    <div v-else class="d-flex align-center justify-space-between mt-4">
      <div style="display: flex; align-items: center;">
        <h1>{{ value.current }}</h1>
        <h3 style="margin-left: 1rem;">({{ $t('global.previous') }}: {{ value.previous }})</h3>
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
import { useSaplingKpiTrend } from '@/composables/kpi/useSaplingKpiTrend';
import type { KPIItem } from '@/entity/entity';

const props = defineProps<{ kpi: KPIItem }>();
const value = ref<KpiTrendValue>({ current: 0, previous: 0 });
const loading = ref(false);

const { trendIcon } = useSaplingKpiTrend(value);

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
