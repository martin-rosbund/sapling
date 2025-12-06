<template>
  <div>
    <div v-if="loading" class="text-caption text-grey">Loading...</div>
    <div v-else class="text-h2 font-weight-bold mt-4">{{ value }}</div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue';
import ApiService from '@/services/api.service';
import { useKpiItem } from '@/composables/kpi/useKpiItem';

const props = defineProps<{ kpi: any }>();

const value = ref(0);
const loading = ref(false);

async function loadKpiValue() {
  if (!props.kpi?.handle) return;
  loading.value = true;
  try {
    const result = await ApiService.findAll<{ value: number }>(`kpi/execute/${props.kpi.handle}`);
    value.value = useKpiItem(result?.value ?? 0).value ?? 0;
  } catch {
    value.value = 0;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadKpiValue();
});

// Ermögliche externen Refresh
defineExpose({ loadKpiValue });

// Optional: Bei Änderung des Handles neu laden
watch(() => props.kpi?.handle, (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) loadKpiValue();
});
</script>
