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
  import { defineProps } from 'vue';
  const props = defineProps<{ rows: Array<Record<string, any>>, columns: string[] }>();
</script>
