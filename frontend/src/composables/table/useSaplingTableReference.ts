import type { EntityTemplate } from '@/entity/structure';
import { computed, unref } from 'vue';
import type { ComputedRef, Ref } from 'vue';

export function useSaplingReference(
  object: Ref<Record<string, string | number | boolean>>,
  headers: Ref<{ key: string; title: string; type?: string }[]>,
  formatValue: Ref<(value: string, type?: string) => string>,
  templates: Ref<EntityTemplate[]>
): { panelTitle: ComputedRef<string> } {

  const panelTitle = computed(() => {
    console.log(unref(templates));
    const obj = unref(object);
    const hdrs = unref(headers);
    const fmt = unref(formatValue);
    return hdrs.slice(0, 2)
      .map(header => fmt(String(obj?.[header.key] ?? ''), header.type))
      .join(' | ');
  });
  return { panelTitle };
}
