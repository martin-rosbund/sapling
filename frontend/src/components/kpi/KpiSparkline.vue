<template>
  <div v-if="value.length === 0" class="text-caption text-grey">{{ $t('global.noData') }}</div>
  <div v-else>
    <v-sparkline
      :auto-line-width="autoLineWidth"
      :fill="fill"
      :gradient="gradient"
      :gradient-direction="gradientDirection"
      :line-width="width"
      :model-value="value"
      :padding="padding"
      :smooth="radius || false"
      :stroke-linecap="lineCap"
      :type="type"
      style="max-height: 105px;"
      auto-draw
    ></v-sparkline>
    <div class="d-flex justify-space-between mt-1 text-caption">
      <span v-if="firstLabel">{{ firstLabel }}: {{ firstValue }}</span>
      <span v-if="lastLabel">{{ lastLabel }}: {{ lastValue }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
// #region Imports
import { computed, ref } from 'vue';
// #endregion

// #region Props
// Define component props
interface SparklineDataPoint {
  value: number;
  [key: string]: any;
}
const props = defineProps<{ data: SparklineDataPoint[] }>();
// #endregion

// #region State
// Sparkline visual configuration
const gradients = [
  ['#f72047', '#ffd200', '#1feaea']
];
const width = ref(3);
const radius = ref(10);
const padding = ref(8);
const lineCap = ref<'round' | 'butt' | 'square'>('round');
const gradient = ref(gradients[0]);
const gradientDirection = ref<'top' | 'bottom' | 'left' | 'right'>('top');
const fill = ref(false);
const type = ref<'trend' | 'bar'>('trend');
const autoLineWidth = ref(false);
// #endregion

// #region Computed
// Map incoming data to array of values for sparkline
const value = computed(() => {
  if (
    Array.isArray(props.data) &&
    props.data.length &&
    props.data[0] !== null &&
    typeof props.data[0] === 'object' &&
    'value' in props.data[0]
  ) {
    return props.data.map((d: SparklineDataPoint) => d.value);
  }
  return [];
});

const firstValue = computed(() => (value.value.length > 0 ? value.value[0] : null));
const lastValue = computed(() => (value.value.length > 0 ? value.value[value.value.length - 1] : null));

const firstLabel = computed(() => {
  if (Array.isArray(props.data) && props.data.length > 0) {
    const d = props.data[0];
    if (d && typeof d === 'object') {
      if ('day' in d && 'month' in d && 'year' in d) return `${d.day}.${d.month}/${d.year}`;
      if ('month' in d && 'year' in d) return `${d.month}/${d.year}`;
    }
  }
  return null;
});

const lastLabel = computed(() => {
  if (Array.isArray(props.data) && props.data.length > 0) {
    const d = props.data[props.data.length - 1];
    if (d && typeof d === 'object') {
      if ('day' in d && 'month' in d && 'year' in d) return `${d.day}.${d.month}/${d.year}`;
      if ('month' in d && 'year' in d) return `${d.month}/${d.year}`;
    }
  }
  return null;
});
// #endregion
</script>