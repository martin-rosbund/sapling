import { ref, onMounted } from 'vue';
import ApiGenericService from '@/services/api.generic.service';
import type { EntityItem } from '@/entity/entity';

export function useSaplingFavorites() {
  const DEFAULT_FAVORITE_ICON = 'mdi-bookmark';
  const entity = ref<EntityItem | null>(null);

  onMounted(async () => {
    await loadEntity();
  });

  async function loadEntity() {
    entity.value = (await ApiGenericService.find<EntityItem>('entity', { filter: { handle: 'favorite' }, limit: 1, page: 1 })).data[0] || null;
  }

  return {
    DEFAULT_FAVORITE_ICON,
    entity,
    loadEntity,
  };
}
