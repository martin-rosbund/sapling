<template>
  <div class="text-h2 font-weight-bold mt-4">{{ value }}</div>
</template>

<script lang="ts" setup>
// #region Imports
import { useKpiItem } from '@/composables/kpi/useKpiItem';
// #endregion

// #region Props
const props = defineProps<{ kpi: any }>();
// #endregion

// #region Composable
// Extrahiere den Wert aus kpi
const { value } = useKpiItem(props.kpi?.value ?? '');
// #endregion
</script>
