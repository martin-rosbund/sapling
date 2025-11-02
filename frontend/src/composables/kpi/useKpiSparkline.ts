import { computed, ref } from 'vue';

interface SparklineDataPoint {
  value: number;
  [key: string]: any;
}

export function useKpiSparkline(data: SparklineDataPoint[]) {
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

  const value = computed(() => {
    if (
      Array.isArray(data) &&
      data.length &&
      data[0] !== null &&
      typeof data[0] === 'object' &&
      'value' in data[0]
    ) {
      return data.map((d: SparklineDataPoint) => d.value);
    }
    return [];
  });

  const firstValue = computed(() => (value.value.length > 0 ? value.value[0] : null));
  const lastValue = computed(() => (value.value.length > 0 ? value.value[value.value.length - 1] : null));

  const firstLabel = computed(() => {
    if (Array.isArray(data) && data.length > 0) {
      const d = data[0];
      if (d && typeof d === 'object') {
        if ('day' in d && 'month' in d && 'year' in d) return `${d.day}.${d.month}/${d.year}`;
        if ('month' in d && 'year' in d) return `${d.month}/${d.year}`;
      }
    }
    return null;
  });

  const lastLabel = computed(() => {
    if (Array.isArray(data) && data.length > 0) {
      const d = data[data.length - 1];
      if (d && typeof d === 'object') {
        if ('day' in d && 'month' in d && 'year' in d) return `${d.day}.${d.month}/${d.year}`;
        if ('month' in d && 'year' in d) return `${d.month}/${d.year}`;
      }
    }
    return null;
  });

  return {
    gradients,
    width,
    radius,
    padding,
    lineCap,
    gradient,
    gradientDirection,
    fill,
    type,
    autoLineWidth,
    value,
    firstValue,
    lastValue,
    firstLabel,
    lastLabel,
  };
}
