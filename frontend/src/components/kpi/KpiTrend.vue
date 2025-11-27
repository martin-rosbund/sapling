<template>
  <div class="d-flex align-center justify-space-between mt-4">
    <div>
      <span class="text-h2 font-weight-bold mr-2">{{ value.current }}</span>
      <span class="text-h5 ml-2">({{ $t('global.previous') }}: {{ value.previous }})</span>
    </div>
    <div>
      <v-icon v-if="value.current > value.previous" color="green" style="font-size: 3rem;">mdi-arrow-up-bold</v-icon>
      <v-icon v-else-if="value.current < value.previous" color="red" style="font-size: 3rem;">mdi-arrow-down-bold</v-icon>
      <v-icon v-else color="grey" style="font-size: 3rem;">mdi-equal</v-icon>
    </div>
  </div>
</template>

<script lang="ts" setup>
// #region Imports
import { defineProps } from 'vue';
import { useKpiTrend } from '@/composables/kpi/useKpiTrend';
// #endregion

// #region Props
const props = defineProps<{ value: { current: number, previous: number } }>();
// #endregion

// #region Composable
const {} = useKpiTrend(props.value);
// #endregion
</script>
