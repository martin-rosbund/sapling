import { ref, computed, watch } from 'vue';
import ApiGenericService from '@/services/api.generic.service';
import type { EntityItem } from '@/entity/entity';
import { i18n } from '@/i18n';
import { useGenericStore } from '@/stores/genericStore';

export function useSaplingAgent() {
  //#region State
  const searchMenu = ref(false);
  const searchQuery = ref('');
  const selectedEntity = ref(null);
  const entities = ref<EntityItem[]>([]);

  // Access the generic store for managing favorites
  const genericStore = useGenericStore();

  // Load the generic store data for the 'entity' entity
  genericStore.loadGeneric('entity', 'global', 'agent');
  
  // Entity options for v-select
  const entityOptions = computed(() =>
    entities.value.map(e => ({
      title: i18n.global.t(`navigation.${e.handle}`),
      value: e.handle,
      icon: e.icon
    }))
  );
  //#endregion

  //#region Lifecycle
  // Load entities when menu opens
  watch(searchMenu, async (val) => {
    if (!val) return;

    const result = await ApiGenericService.find<EntityItem>('entity', { filter: { canShow: true } });
    entities.value = result.data;
  });
  //#endregion

  //#region Methods
  function onSearch() {
    if (searchQuery.value.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.value)}`;
    }
  }
  //#endregion

  //#region Return
  return {
    searchMenu,
    searchQuery,
    selectedEntity,
    entityOptions,
    onSearch,
  };
  //#endregion
}
