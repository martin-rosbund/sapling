<template>
  <div style="max-height: 145px; overflow-y: auto;">
    <v-skeleton-loader v-if="loading" type="text, text, text, text"/>
    <v-table v-else density="compact" class="kpi-table">
      <tbody>
        <tr
          v-for="(row, rowIdx) in rows"
          :key="rowIdx"
          :class="{ 'kpi-table-row--clickable': canOpenEntity }"
          @click="openEntity(row)"
        >
          <td v-for="col in columns" :key="col">{{ row[col] }}</td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<script lang="ts" setup>
import { useSaplingKpiList } from '@/composables/kpi/useSaplingKpiList';
import type { KPIItem } from '@/entity/entity';

const props = defineProps<{ kpi: KPIItem }>();
const { rows, columns, loading, canOpenEntity, openEntity, loadKpiValue } = useSaplingKpiList(props.kpi);

defineExpose({ loadKpiValue });
</script>

<style scoped>
.kpi-table-row--clickable {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.kpi-table-row--clickable:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}
</style>
