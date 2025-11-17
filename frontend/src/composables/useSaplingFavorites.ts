import { useGenericStore } from '@/stores/genericStore';

export function useSaplingFavorites() {
  const DEFAULT_FAVORITE_ICON = 'mdi-bookmark';
  const genericStore = useGenericStore();
  const key = 'favorite|global';
  genericStore.loadGeneric(key, 'favorite', 'global');
  const entity = () => genericStore.getState(key).entity;
  const isLoading = () => genericStore.getState(key).isLoading;
  const loadGeneric = () => genericStore.loadGeneric(key, 'favorite', 'global');

  return {
    DEFAULT_FAVORITE_ICON,
    entity,
    isLoading,
    loadGeneric,
  };
}
