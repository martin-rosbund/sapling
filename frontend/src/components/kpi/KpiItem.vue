<template>
  <div style="max-height: 145px; overflow-y: auto;">
    <v-skeleton-loader v-if="loading" type="avatar"/>
    <h1 v-else>{{ value }}</h1>
  </div>
</template>

<script lang="ts" setup>
import { useKpiItem } from '@/composables/kpi/useKpiItem';
import type { KPIItem } from '@/entity/entity';

const props = defineProps<{ kpi: KPIItem }>();
const { value, loading, loadKpiValue } = useKpiItem(props.kpi);

defineExpose({ loadKpiValue });

</script>
