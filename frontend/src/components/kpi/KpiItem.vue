<template>
  <div>
    <v-skeleton-loader v-if="loading" type="heading, text" class="mt-4 transparent" :loading="loading" height="48px" width="100%" />
    <div v-else class="text-h2 font-weight-bold mt-4">{{ value }}</div>
  </div>
</template>

<script lang="ts" setup>
import { useKpiItem } from '@/composables/kpi/useKpiItem';

const props = defineProps<{ kpi: any }>();
const { value, loading, loadKpiValue } = useKpiItem(props.kpi);

defineExpose({ loadKpiValue });

</script>
