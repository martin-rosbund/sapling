import type { SaplingTableHeaderItem } from '@/entity/structure';
import { computed } from 'vue';
import type { ComputedRef, Ref } from 'vue';

export function useSaplingReference(
  object: Ref<Record<string, string | number | boolean>>,
  headers: Ref<SaplingTableHeaderItem[]>,
  formatValue: Ref<(value: string, type?: string) => string>,
): { panelTitle: ComputedRef<string> } {

  const panelTitle = computed(() => {

    return headers.value.filter(x => x.isShowInCompact === true)
      .map(header => formatValue.value(String(object.value?.[header.key] ?? ''), header.type))
      .join(' | ');
  });
  return { panelTitle };
}
