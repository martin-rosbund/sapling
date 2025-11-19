import { useGenericStore } from '@/stores/genericStore';

export function useSaplingFavorites() {
  const DEFAULT_FAVORITE_ICON = 'mdi-bookmark';
  const genericStore = useGenericStore();
  genericStore.loadGeneric('favorite', 'global');
  const entity = () => genericStore.getState('favorite').entity;
  const isLoading = () => genericStore.getState('favorite').isLoading;
  const loadGeneric = () => genericStore.loadGeneric('favorite', 'global');

  return {
    DEFAULT_FAVORITE_ICON,
    entity,
    isLoading,
    loadGeneric,
  };
}
