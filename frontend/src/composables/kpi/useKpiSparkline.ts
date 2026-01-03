import { ref, computed, unref, watch, onMounted, type Ref } from 'vue';
import ApiService from '@/services/api.service';
import type { KpiSparklineData, KpiSparklineValue } from '@/entity/structure';

interface SparklineDataPoint {
  value: number;
  [key: string]: unknown;
}

export function useKpiSparkline(kpi: any) {
  const gradients = [
    ['#1feaea', '#ffd200', '#f72047']
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

  const data = ref<KpiSparklineValue[]>([]);
  const loading = ref(false);

  async function loadKpiValue() {
    if (!kpi?.handle) return;
    loading.value = true;
    try {
      const result = await ApiService.findAll<KpiSparklineData>(`kpi/execute/${kpi.handle}`);
      const val = result?.value ?? [];
      if (Array.isArray(val)) {
        data.value = val.filter((d) => typeof d === 'object' && d !== null && 'value' in d);
      } else {
        data.value = [];
      }
    } catch {
      data.value = [];
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    loadKpiValue();
  });

  watch(() => kpi?.handle, (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) loadKpiValue();
  });

  const value = computed(() => {
    const arr = unref(data);
    if (
      Array.isArray(arr) &&
      arr.length &&
      arr[0] !== null &&
      typeof arr[0] === 'object' &&
      'value' in arr[0]
    ) {
      return arr.map((d: SparklineDataPoint) => d.value);
    }
    return [];
  });

  const firstValue = computed(() => (value.value.length > 0 ? value.value[0] : null));
  const lastValue = computed(() => (value.value.length > 0 ? value.value[value.value.length - 1] : null));

  const firstLabel = computed(() => {
    const arr = unref(data);
    if (Array.isArray(arr) && arr.length > 0) {
      const d = arr[0];
      if (d && typeof d === 'object') {
        if ('day' in d && 'month' in d && 'year' in d) return `${d.day}.${d.month}/${d.year}`;
        if ('month' in d && 'year' in d) return `${d.month}/${d.year}`;
      }
    }
    return null;
  });

  const lastLabel = computed(() => {
    const arr = unref(data);
    if (Array.isArray(arr) && arr.length > 0) {
      const d = arr[arr.length - 1];
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
    loading,
    loadKpiValue,
  };
}
