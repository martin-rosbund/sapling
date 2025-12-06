<template>
  <div style="max-height: 112px; overflow-y: auto; margin-top: 1rem;">
    <v-table density="compact" class="kpi-table glass-table">
      <tbody>
        <tr v-for="(row, rowIdx) in rows" :key="rowIdx">
          <td v-for="col in columns" :key="col">{{ row[col] }}</td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<script lang="ts" setup>
// #region Imports
import { useKpiList } from '@/composables/kpi/useKpiList';
// #endregion

// #region Props
const props = defineProps<{ kpi: any }>();
// #endregion

// #region Composable
// Extrahiere rows und columns aus kpi
function getKpiTableRows(kpi: any): Array<Record<string, unknown>> {
  const val = kpi?.value;
  if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
    return val as Array<Record<string, unknown>>;
  }
  return [];
}

function getKpiTableColumns(kpi: any): string[] {
  const rows = getKpiTableRows(kpi);
  if (rows.length > 0 && rows[0]) {
    return Object.keys(rows[0]);
  }
  return [];
}

const rows = getKpiTableRows(props.kpi);
const columns = getKpiTableColumns(props.kpi);
// #endregion
</script>
