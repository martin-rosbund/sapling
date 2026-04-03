<template>
  <div style="max-height: 145px; overflow-y: auto;">
    <v-skeleton-loader v-if="loading" type="heading, text, text"/>
    <div v-else class="d-flex align-center justify-space-between mt-4">
      <div style="display: flex; align-items: center;">
        <h1>{{ value.current }}</h1>
        <h3 style="margin-left: 1rem;">({{ $t('global.previous') }}: {{ value.previous }})</h3>
      </div>
      <div>
        <v-icon :color="trendIcon.color" style="font-size: 3rem;">{{ trendIcon.icon }}</v-icon>
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
const { value, loading, trendIcon, loadKpiValue } = useSaplingKpiTrend(toRef(props, 'kpi'));

defineExpose({ loadKpiValue });
// #endregion
</script>
