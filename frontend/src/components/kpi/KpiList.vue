<template>
  <div style="max-height: 112px; overflow-y: auto; margin-top: 1rem;">
    <div v-if="loading" class="text-caption text-grey">Loading...</div>
    <v-table v-else density="compact" class="kpi-table glass-table">
      <tbody>
        <tr v-for="(row, rowIdx) in rows" :key="rowIdx">
          <td v-for="col in columns" :key="col">{{ row[col] }}</td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue';
import ApiService from '@/services/api.service';
import type { KpiListData } from '@/entity/structure';

const props = defineProps<{ kpi: any }>();

const rows = ref<Array<Record<string, unknown>>>([]);
const columns = ref<string[]>([]);
const loading = ref(false);

async function loadKpiValue() {
  if (!props.kpi?.handle) return;
  loading.value = true;
  try {
    const result = await ApiService.findAll<KpiListData>(`kpi/execute/${props.kpi.handle}`);
    const val = result?.value ?? [];
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
      rows.value = val;
      columns.value = Object.keys(val[0]);
    } else {
      rows.value = [];
      columns.value = [];
    }
  } catch {
    rows.value = [];
    columns.value = [];
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
