import type { SaplingGenericItem } from '@/entity/entity';
import { ref, watch } from 'vue';

export function useSaplingSingleSelectField(props: {
  label: string,
  entityName: string,
  modelValue?: SaplingGenericItem,
  rules?: Array<(v: unknown) => true | string>;
}) {
  const menuOpen = ref(false);
  const selectedItem = ref<SaplingGenericItem | null>(props.modelValue ?? null);

  watch(() => props.modelValue, (val) => {
    selectedItem.value = val ?? null;
  });

  return {
    menuOpen,
    selectedItem,
  };
}
