import { ref, watch, computed, onMounted } from 'vue';
import { formatValue } from '@/utils/saplingFormatUtil';
import { useGenericStore } from '@/stores/genericStore';
import type { EntityTemplate } from '@/entity/structure';

export function useSaplingDropdownField(props: {
  columns: EntityTemplate[],
  fetchReferenceData: (params: { search: string, page: number, pageSize: number }) => Promise<{ items: Record<string, unknown>[], total: number }>,
  modelValue: Record<string, unknown> | null,
  template: EntityTemplate;
}) {
  const menu = ref(false);
  const search = ref('');
  const items = ref<unknown[]>([]);
  const page = ref(1);
  const pageSize = 20;
  const total = ref(0);
  const loading = ref(false);
  const selected = ref<Record<string, unknown> | null>(props.modelValue);

  const genericStore = useGenericStore();
  genericStore.loadGeneric(props.template.referenceName ?? '', 'global');
  const entityPermission = computed(() => genericStore.getState(props.template.referenceName ?? '').entityPermission);
  const isLoading = computed(() => genericStore.getState(props.template.referenceName ?? '').isLoading);

  const selectedLabel = computed(() => {
    if (!selected.value || !props.template?.referencedPks) return;
    return props.columns.filter(x => x.options?.includes('isShowInCompact'))
      .map(x => formatValue(String(selected.value?.[x.key] ?? ''), x.type))
      .join(' | ');
  });

  async function loadData(reset = false) {
    if (loading.value) return;
    loading.value = true;
    if (reset) {
      page.value = 1;
      items.value = [];
    }
    const { items: newItems, total: newTotal } = await props.fetchReferenceData({
      search: search.value,
      page: page.value,
      pageSize
    });
    items.value = reset ? newItems : [...items.value, ...newItems];
    total.value = newTotal;
    loading.value = false;
  }

  function onSearch() {
    loadData(true);
  }

  function onScroll(e: Event) {
    const el = e.target as HTMLElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10 && items.value.length < total.value) {
      page.value += 1;
      loadData();
    }
  }

  function selectRow(idx: number, emit: (event: string, value: unknown) => void) {
    const item = items.value[idx];
    selected.value = item as Record<string, unknown>;
    emit('update:modelValue', item);
    menu.value = false;
  }

  function clearSelection(emit: (event: string, value: unknown) => void) {
    selected.value = null;
    emit('update:modelValue', null);
    menu.value = false;
  }

  function isSelected(item: Record<string, unknown>) {
    if (!selected.value || !props.template?.referencedPks) return false;
    return (props.template.referencedPks).every((x) => {
      return (selected.value as Record<string, unknown>)[x] === item[x];
    });
  }

  watch(() => props.modelValue, val => {
    selected.value = val;
  });

  onMounted(() => {
    if(!isLoading.value) {
      loadData();
    }
  });

  watch(
    () => isLoading.value,
    () => {
      if(isLoading.value) return;
      loadData();
    }
  );

  return {
    menu,
    search,
    items,
    page,
    pageSize,
    total,
    loading,
    selected,
    entityPermission,
    isLoading,
    selectedLabel,
    loadData,
    onSearch,
    onScroll,
    selectRow,
    clearSelection,
    isSelected
  };
}
