
import type { SaplingGenericItem } from '@/entity/entity';
import type { EntityTemplate } from '@/entity/structure';
import { computed, ref } from 'vue';
import CookieService from '@/services/cookie.service';

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

  const formattedJson = computed({
    get() {
      return JSON.stringify(props.item[props.template.key || ''] ?? {}, null, 2).trim();
    },
    set() {
      // read-only, do nothing
    }
  });

  const loadTheme = computed(() => {
    return CookieService.get('theme') === 'dark' ? 'vs-dark' : 'vs';
  });

  const editorOptions = {
    readOnly: true,
    minimap: { enabled: false },
    automaticLayout: true
  };

  return {
    jsonDialogKeyRef,
    openJsonDialog,
    closeJsonDialog,
    formattedJson,
    loadTheme,
    editorOptions
  };
}
