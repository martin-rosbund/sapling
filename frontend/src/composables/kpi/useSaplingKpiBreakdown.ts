import type { KPIItem } from '@/entity/entity';
import { useSaplingKpiList } from '@/composables/kpi/useSaplingKpiList';
import { computed, type MaybeRefOrGetter } from 'vue';
import { normalizeKpiNumericValue } from '@/utils/saplingKpiValue';

export function useSaplingKpiBreakdown(
  kpi: MaybeRefOrGetter<KPIItem | null | undefined>,
) {
  const {
    rows,
    columns,
    loading,
    hasError,
    isLoaded,
    hasData,
    canOpenEntity,
    openEntity,
    loadKpiValue,
  } = useSaplingKpiList(kpi);

  const labelColumn = computed(
    () => columns.value.find((column) => column !== 'value') ?? columns.value[0] ?? null,
  );

  const items = computed(() => {
    const currentLabelColumn = labelColumn.value;

    if (!currentLabelColumn) {
      return [];
    }

    const normalizedItems = rows.value.map((row, index) => ({
      key: `${String(row[currentLabelColumn] ?? 'item')}-${index}`,
      label: String(row[currentLabelColumn] ?? 'Unknown'),
      value: normalizeKpiNumericValue(row.value),
      row,
    }));
    const maxValue = normalizedItems.reduce(
      (highestValue, item) => Math.max(highestValue, item.value),
      0,
    );

    return normalizedItems
      .sort((left, right) => right.value - left.value)
      .slice(0, 6)
      .map((item) => ({
        ...item,
        share: maxValue > 0 ? Math.round((item.value / maxValue) * 100) : 0,
      }));
  });

  const totalValue = computed(() => items.value.reduce((sum, item) => sum + item.value, 0));
  const leadItem = computed(() => items.value[0] ?? null);
  const trailingItems = computed(() => items.value.slice(1));
  const leadShareLabel = computed(() => {
    if (!leadItem.value || totalValue.value <= 0) {
      return '0% share';
    }

    return `${Math.round((leadItem.value.value / totalValue.value) * 100)}% share`;
  });
  const categoryCountLabel = computed(() => `${items.value.length} segments`);
  const spreadLabel = computed(() => {
    const strongestValue = leadItem.value?.value ?? 0;
    const weakestValue = items.value[items.value.length - 1]?.value ?? 0;

    if (items.value.length === 0) {
      return '0 spread';
    }

    return `${strongestValue - weakestValue} spread`;
  });

  function openBreakdownItem(row: Record<string, unknown>) {
    openEntity(row);
  }

  return {
    items,
    totalValue,
    leadItem,
    trailingItems,
    leadShareLabel,
    categoryCountLabel,
    spreadLabel,
    loading,
    hasError,
    isLoaded,
    hasData,
    canOpenEntity,
    openBreakdownItem,
    loadKpiValue,
  };
}