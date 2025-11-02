import { computed } from 'vue';

export function useKpiTrend(value: { current: number; previous: number }) {
  const trendIcon = computed(() => {
    if (value.current > value.previous) return { icon: 'mdi-arrow-up-bold', color: 'green' };
    if (value.current < value.previous) return { icon: 'mdi-arrow-down-bold', color: 'red' };
    return { icon: 'mdi-equal', color: 'grey' };
  });
  return {
    trendIcon,
  };
}
