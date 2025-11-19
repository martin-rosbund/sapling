// Import the generic store for managing application state
import { useGenericStore } from '@/stores/genericStore';

export function useSaplingFavorites() {
  //#region State
  // Default icon for favorites
  const DEFAULT_FAVORITE_ICON = 'mdi-bookmark';

  // Access the generic store for managing favorites
  const genericStore = useGenericStore();

  // Load the generic store data for the 'favorite' entity
  genericStore.loadGeneric('favorite', 'global');

  // Reactive property for the favorite entity
  const entity = genericStore.getState('favorite').entity;

  // Reactive property indicating if the favorite data is loading
  const isLoading = genericStore.getState('favorite').isLoading;
  //#endregion

  //#region Return
  // Return all reactive properties and methods for use in components
  return {
    DEFAULT_FAVORITE_ICON,
    entity,
    isLoading,
  };
  //#endregion
}
