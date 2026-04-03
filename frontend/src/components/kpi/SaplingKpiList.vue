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
// #region Imports
import { useSaplingKpiList } from '@/composables/kpi/useSaplingKpiList';
import type { KPIItem } from '@/entity/entity';
import { toRef } from 'vue';
// #endregion

interface SaplingKpiListProps {
  kpi: KPIItem;
}

// #region Props & Composable
const props = defineProps<SaplingKpiListProps>();
const { rows, columns, loading, canOpenEntity, openEntity, loadKpiValue } = useSaplingKpiList(toRef(props, 'kpi'));

defineExpose({ loadKpiValue });
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingKpiList.css"></style>
