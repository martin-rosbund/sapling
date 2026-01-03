<template>
  <div style="max-height: 112px; overflow-y: auto; margin-top: 1rem;">
    <v-skeleton-loader v-if="loading" type="table" class="mt-2 transparent" :loading="loading" height="48px" width="100%" />
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
import { useKpiList } from '@/composables/kpi/useKpiList';

const props = defineProps<{ kpi: any }>();
const { rows, columns, loading, loadKpiValue } = useKpiList(props.kpi);

defineExpose({ loadKpiValue });
</script>
