import { computed, unref } from 'vue';
import type { Ref } from 'vue';

export function useKpiTrend(value: Ref<{ current: number; previous: number }> | { current: number; previous: number }) {
  const getValue = () => unref(value);

  const trendIcon = computed(() => {
    const v = getValue();
    if (v.current > v.previous) return { icon: 'mdi-arrow-up-bold', color: 'green' };
    if (v.current < v.previous) return { icon: 'mdi-arrow-down-bold', color: 'red' };
    return { icon: 'mdi-equal', color: 'grey' };
  });

  const trendText = computed(() => {
    const v = getValue();
    if (v.current > v.previous) return 'up';
    if (v.current < v.previous) return 'down';
    return 'equal';
  });

  const trendValue = computed(() => {
    const v = getValue();
    return v.current - v.previous;
  });

  return {
    trendIcon,
    trendText,
    trendValue,
  };
}
