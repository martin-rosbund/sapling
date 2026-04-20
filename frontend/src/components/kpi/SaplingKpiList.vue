<template>
  <div class="sapling-kpi-widget">
    <v-skeleton-loader v-if="loading && !isLoaded" type="text, text, text, text" />

    <div v-else-if="hasError" class="sapling-kpi-widget__state sapling-kpi-widget__state--error">
      <v-icon size="20">mdi-alert-circle-outline</v-icon>
      <span>{{ $t('exception.unknownError') }}</span>
    </div>

    <div v-else-if="!hasData" class="sapling-kpi-widget__state">
      <v-icon size="20">mdi-database-off-outline</v-icon>
      <span>{{ $t('global.noData') }}</span>
    </div>

    <v-table v-else density="compact" class="kpi-table sapling-kpi-list__table">
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
import { useSaplingKpiList } from '@/composables/kpi/useSaplingKpiList'
import type { KPIItem } from '@/entity/entity'
import { toRef } from 'vue'
// #endregion

interface SaplingKpiListProps {
  kpi: KPIItem
}

// #region Props & Composable
const props = defineProps<SaplingKpiListProps>()
const {
  rows,
  columns,
  loading,
  hasError,
  isLoaded,
  hasData,
  canOpenEntity,
  openEntity,
  loadKpiValue,
} = useSaplingKpiList(toRef(props, 'kpi'))

defineExpose({ loadKpiValue, loading, hasError, hasData, isLoaded })
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingKpiList.css"></style>
