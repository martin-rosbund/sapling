import { useEntityLoader } from '@/composables/generic/useEntityLoader';

export function useSaplingFavorites() {
  const DEFAULT_FAVORITE_ICON = 'mdi-bookmark';
  const { entity, isLoading, loadEntity } = useEntityLoader('entity', { filter: { handle: 'favorite' }, limit: 1, page: 1 });

  return {
    DEFAULT_FAVORITE_ICON,
    entity,
    isLoading,
    loadEntity,
  };
}
