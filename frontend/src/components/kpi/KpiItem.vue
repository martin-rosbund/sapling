<template>
  <div class="text-h2 font-weight-bold mt-4">{{ value }}</div>
</template>

<script lang="ts" setup>
// #region Imports
import { defineProps } from 'vue';
import { useKpiItem } from '@/composables/kpi/useKpiItem';
// #endregion

// #region Props
const props = defineProps<{ value: string | number }>();
// #endregion

// #region Composable
const { value } = useKpiItem(props.value);
// #endregion
</script>
