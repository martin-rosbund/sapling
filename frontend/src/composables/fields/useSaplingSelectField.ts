import type { SaplingGenericItem } from '@/entity/entity';
import { ref, watch } from 'vue';

export function useSaplingSelectField( props: {
  label: string,
  entityName: string,
  modelValue?: SaplingGenericItem[],
  rules?: Array<(v: unknown) => true | string>;
}) {

  const menuOpen = ref(false);
  const selectedItems = ref<SaplingGenericItem[]>(props.modelValue ?? []);

  watch(() => props.modelValue, (val) => {
    if (val) selectedItems.value = val;
  });
  
  return { 
    menuOpen, 
    selectedItems 
  };
}
