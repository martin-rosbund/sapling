import { useGenericLoader } from './generic/useGenericLoader';

export function useSaplingFavorites() {
  const DEFAULT_FAVORITE_ICON = 'mdi-bookmark';
  const { entity, isLoading, loadGeneric } = useGenericLoader('favorite');

  return {
    DEFAULT_FAVORITE_ICON,
    entity,
    isLoading,
    loadGeneric,
  };
}
