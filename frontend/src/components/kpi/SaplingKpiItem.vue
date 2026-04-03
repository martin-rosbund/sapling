<template>
  <div style="max-height: 145px; overflow-y: auto;">
    <v-skeleton-loader v-if="loading" type="avatar"/>
    <h1 v-else>{{ value }}</h1>
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
const { value, loading, loadKpiValue } = useSaplingKpiItem(toRef(props, 'kpi'));

defineExpose({ loadKpiValue });
// #endregion
</script>
