<template>
  <div class="sapling-kpi-widget sapling-kpi-trend">
    <v-skeleton-loader v-if="loading && !isLoaded" type="heading, text, text" />

    <div v-else-if="hasError" class="sapling-kpi-widget__state sapling-kpi-widget__state--error">
      <v-icon size="20">mdi-alert-circle-outline</v-icon>
      <span>{{ $t('exception.unknownError') }}</span>
    </div>

    <div v-else-if="!hasData" class="sapling-kpi-widget__state">
      <v-icon size="20">mdi-database-off-outline</v-icon>
      <span>{{ $t('global.noData') }}</span>
    </div>

    <div v-else class="sapling-kpi-trend__content">
      <div class="sapling-kpi-trend__values">
        <h1 class="sapling-kpi-trend__current">{{ value.current }}</h1>
        <h3 class="sapling-kpi-trend__previous">{{ $t('global.previous') }}: {{ value.previous }}</h3>
      </div>
      <div class="sapling-kpi-trend__icon-wrap">
        <v-icon :color="trendIcon.color" class="sapling-kpi-trend__icon">{{ trendIcon.icon }}</v-icon>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
// #region Imports
import { useSaplingKpiTrend } from '@/composables/kpi/useSaplingKpiTrend';
import type { KPIItem } from '@/entity/entity';
import { toRef } from 'vue';
// #endregion

interface SaplingKpiTrendProps {
  kpi: KPIItem;
}

// #region Props & Composable
const props = defineProps<SaplingKpiTrendProps>();
const { value, loading, hasError, isLoaded, hasData, trendIcon, loadKpiValue } = useSaplingKpiTrend(toRef(props, 'kpi'));

defineExpose({ loadKpiValue, loading, hasError, hasData, isLoaded });
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingKpiTrend.css"></style>
