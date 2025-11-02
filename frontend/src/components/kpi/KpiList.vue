<template>
  <div style="max-height: 112px; overflow-y: auto; margin-top: 1rem;">
    <v-table density="compact" class="kpi-table">
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
import { defineProps } from 'vue';
import { useKpiList } from '@/composables/kpi/useKpiList';
// #endregion

// #region Props
const props = defineProps<{ rows: Array<Record<string, any>>, columns: string[] }>();
// #endregion

// #region Composable
const { rows, columns } = useKpiList(props.rows, props.columns);
// #endregion
</script>
