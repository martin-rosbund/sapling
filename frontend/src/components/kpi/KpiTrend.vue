<template>
  <div>
    <div v-if="loading" class="text-caption text-grey">Loading...</div>
    <div v-else class="d-flex align-center justify-space-between mt-4">
      <div>
        <span class="text-h2 font-weight-bold mr-2">{{ value.current }}</span>
        <span class="text-h5 ml-2">({{ $t('global.previous') }}: {{ value.previous }})</span>
      </div>
      <div>
        <v-icon v-if="value.current > value.previous" color="green" style="font-size: 3rem;">mdi-arrow-up-bold</v-icon>
        <v-icon v-else-if="value.current < value.previous" color="red" style="font-size: 3rem;">mdi-arrow-down-bold</v-icon>
        <v-icon v-else color="grey" style="font-size: 3rem;">mdi-equal</v-icon>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue';
import ApiService from '@/services/api.service';

const props = defineProps<{ kpi: any }>();

const value = ref<{ current: number, previous: number }>({ current: 0, previous: 0 });
const loading = ref(false);

async function loadKpiValue() {
  if (!props.kpi?.handle) return;
  loading.value = true;
  try {
    const result = await ApiService.findAll<{ value: { current: number, previous: number } }>(`kpi/execute/${props.kpi.handle}`);
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
