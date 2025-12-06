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
// #region Props
const props = defineProps<{ kpi: any }>();
// #endregion

// #region Composable
function getKpiTrendValue(kpi: any): { current: number, previous: number } {
  const val = kpi?.value;
  if (val && typeof val === 'object' && 'current' in val && 'previous' in val) {
    return { current: val.current, previous: val.previous };
  }
  return { current: 0, previous: 0 };
}

const value = getKpiTrendValue(props.kpi);
// #endregion
</script>
