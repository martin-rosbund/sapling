import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import ApiGenericService from '@/services/api.generic.service';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
import { i18n } from '@/i18n';
import type { FavoriteItem, EntityItem } from '../../entity/entity';
import { useGenericStore } from '@/stores/genericStore';

interface FavoriteEntityOption extends EntityItem {
  title: string;
}

/**
 * Encapsulates favorite drawer state, loading and favorite CRUD behaviour.
 */
export function useSaplingFavorites() {
  // #region State & Refs
  const addFavoriteDialog = ref(false);
  const newFavoriteTitle = ref('');
  const selectedFavoriteEntity = ref<EntityItem | null>(null);
  const entities = ref<EntityItem[]>([]);
  const favorites = ref<FavoriteItem[]>([]);
  const currentPersonStore = useCurrentPersonStore();
  const router = useRouter();
  const genericStore = useGenericStore();
  // #endregion

  // #region Computed
  const entityOptions = computed<FavoriteEntityOption[]>(() =>
    entities.value.map(e => ({
      ...e,
      title: i18n.global.t(`navigation.${e.handle}`),
    }))
  );
  const entity = computed(() => genericStore.getState('favorite').entity);
  // #endregion

  // #region Methods
  /**
   * Ensures that the current person is available before person-scoped favorite requests run.
   */
  async function ensureCurrentPersonLoaded() {
    if (currentPersonStore.person?.handle) {
      return;
    }

    await currentPersonStore.fetchCurrentPerson();
  }

  /**
   * Loads the current person's favorites.
   */
  async function loadFavorites() {
    await ensureCurrentPersonLoaded();

    if (!currentPersonStore.person || !currentPersonStore.person.handle) {
      favorites.value = [];
      return;
    }

    const favoriteRes = await ApiGenericService.find<FavoriteItem>('favorite', {
      filter: { person: { handle: currentPersonStore.person.handle } },
    });
    favorites.value = favoriteRes.data || [];
  }

  /**
   * Loads all entities that can be targeted by a favorite.
   */
  async function loadEntities() {
    entities.value = (await ApiGenericService.find<EntityItem>('entity', {
      filter: { canShow: true },
    })).data || [];
  }

  /**
   * Resets the add-favorite form state.
   */
  function resetFavoriteForm() {
    newFavoriteTitle.value = '';
    selectedFavoriteEntity.value = null;
  }

  /**
   * Synchronizes the add-favorite dialog state.
   */
  function updateAddFavoriteDialog(value: boolean) {
    addFavoriteDialog.value = value;

    if (!value) {
      resetFavoriteForm();
    }
  }

  /**
   * Synchronizes the favorite title input.
   */
  function updateNewFavoriteTitle(value: string) {
    newFavoriteTitle.value = value;
  }

  /**
   * Synchronizes the selected favorite entity.
   */
  function updateSelectedFavoriteEntity(value: EntityItem | null) {
    selectedFavoriteEntity.value = value;
  }

  /**
   * Opens the add-favorite dialog with a clean form state.
   */
  function openAddFavoriteDialog() {
    resetFavoriteForm();
    addFavoriteDialog.value = true;
  }

  /**
   * Creates a new favorite and appends the persisted API payload to the local list.
   */
  async function addFavorite() {
    await ensureCurrentPersonLoaded();

    if (
      !newFavoriteTitle.value
      || !selectedFavoriteEntity.value
      || !currentPersonStore.person?.handle
    ) {
      return;
    }

    const createdFavorite = await ApiGenericService.create<FavoriteItem>('favorite', {
      title: newFavoriteTitle.value,
      entity: selectedFavoriteEntity.value.handle,
      person: currentPersonStore.person.handle,
      createdAt: new Date(),
    } as FavoriteItem);

    favorites.value.push({
      ...createdFavorite,
      entity: createdFavorite.entity ?? selectedFavoriteEntity.value,
    });

    updateAddFavoriteDialog(false);
  }

  /**
   * Removes a favorite from the backend and local list.
   */
  async function removeFavorite(favorite: FavoriteItem) {
    const favoriteIndex = favorites.value.findIndex((entry) => entry.handle === favorite.handle);

    if (favoriteIndex === -1) {
      return;
    }

    if (favorite.handle != null) {
      await ApiGenericService.delete('favorite', favorite.handle);
    }

    favorites.value.splice(favoriteIndex, 1);
  }

  /**
   * Navigates to the table route behind a stored favorite, including an optional serialized filter.
   */
  function goToFavorite(favorite: FavoriteItem) {
    const entityHandle = favorite.entity && typeof favorite.entity === 'object'
      ? favorite.entity.handle
      : favorite.entity;

    if (!entityHandle) {
      return;
    }

    let path = `table/${entityHandle}`;
    if (favorite.filter) {
      const serializedFilter = typeof favorite.filter === 'string'
        ? favorite.filter
        : JSON.stringify(favorite.filter);
      path += `?filter=${encodeURIComponent(serializedFilter)}`;
    }

    router.push(path);
  }
  // #endregion

  // #region Lifecycle
  onMounted(async () => {
    await Promise.all([
      loadFavorites(),
      loadEntities(),
    ]);
  });
  // #endregion

  // #region Store Init
  // Load the generic store data for the 'favorite' entity
  genericStore.loadGeneric('favorite', 'global');
  // #endregion

  // #region Return
  return {
    entity,
    addFavoriteDialog,
    newFavoriteTitle,
    selectedFavoriteEntity,
    favorites,
    entityOptions,
    openAddFavoriteDialog,
    updateAddFavoriteDialog,
    updateNewFavoriteTitle,
    updateSelectedFavoriteEntity,
    addFavorite,
    removeFavorite,
    goToFavorite,
  };
  // #endregion
}
