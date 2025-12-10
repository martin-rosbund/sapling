import type { SaplingGenericItem } from '@/entity/entity';
import type { EntityTemplate } from '@/entity/structure';
import { computed, ref } from 'vue';

export function useSaplingTableJson(props: {
  item: SaplingGenericItem;
  template: EntityTemplate;
  jsonDialogKey?: string | null;
}) {
  const dialogKey = ref<string | null>(props.jsonDialogKey ?? null);

  function openJsonDialog(key?: string) {
    dialogKey.value = key ?? null;
  }
  function closeJsonDialog() {
    dialogKey.value = null;
  }
  const jsonDialogKeyRef = computed(() => {
    const result: Record<string, boolean> = {};
    if (props.template.key) {
      result[props.template.key] = dialogKey.value === props.template.key;
    }
    return result;
  });
  return { jsonDialogKeyRef, openJsonDialog, closeJsonDialog };
}
