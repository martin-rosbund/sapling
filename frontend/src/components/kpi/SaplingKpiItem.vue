<template>
  <div class="sapling-kpi-widget sapling-kpi-item">
    <v-skeleton-loader v-if="loading && !isLoaded" type="avatar" />

    <div v-else-if="hasError" class="sapling-kpi-widget__state sapling-kpi-widget__state--error">
      <v-icon size="20">mdi-alert-circle-outline</v-icon>
      <span>{{ $t('exception.unknownError') }}</span>
    </div>

    <div v-else-if="!hasData" class="sapling-kpi-widget__state">
      <v-icon size="20">mdi-database-off-outline</v-icon>
      <span>{{ $t('global.noData') }}</span>
    </div>

    <div v-else class="sapling-kpi-item__value-wrap">
      <h1 class="sapling-kpi-item__value">{{ value }}</h1>
    </div>
  </div>
</template>

<script lang="ts" setup>
// #region Imports
import { useSaplingKpiItem } from '@/composables/kpi/useSaplingKpiItem';
import type { KPIItem } from '@/entity/entity';
import { toRef } from 'vue';
// #endregion

interface SaplingKpiItemProps {
  kpi: KPIItem;
}

// #region Props & Composable
const props = defineProps<SaplingKpiItemProps>();
const { value, loading, hasError, isLoaded, hasData, loadKpiValue } = useSaplingKpiItem(toRef(props, 'kpi'));

defineExpose({ loadKpiValue, loading, hasError, hasData, isLoaded });
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingKpiItem.css"></style>
