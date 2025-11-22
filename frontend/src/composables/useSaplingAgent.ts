import { ref, computed, watch } from 'vue';
import ApiGenericService from '@/services/api.generic.service';
import type { EntityItem } from '@/entity/entity';
import { i18n } from '@/i18n';
import { useGenericStore } from '@/stores/genericStore';

export function useSaplingAgent() {
  // State
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

  // Load entities when menu opens
  watch(searchMenu, async (val) => {
    if (val) {
      try {
        const result = await ApiGenericService.find<EntityItem>('entity', { filter: { canShow: true } });
        entities.value = result.data;
      } catch (e) {
        entities.value = [];
      }
    }
  });

  // Search action
  function onSearch() {
    if (searchQuery.value.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.value)}`;
    }
  }

  return {
    searchMenu,
    searchQuery,
    selectedEntity,
    entityOptions,
    onSearch,
  };
}
