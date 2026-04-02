import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import ApiGenericService from '@/services/api.generic.service';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
import { i18n } from '@/i18n';
import type { FavoriteItem, EntityItem } from '../../entity/entity';
import { useGenericStore } from '@/stores/genericStore';

export function useSaplingFavorites() {
  // #region State & Refs
  const favoriteFormRef = ref<InstanceType<typeof HTMLFormElement> | null>(null);
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
  const entityOptions = computed(() =>
    entities.value.map(e => ({
      ...e,
      title: i18n.global.t(`navigation.${e.handle}`),
    }))
  );
  const entity = computed(() => genericStore.getState('favorite').entity);
  const isLoading = computed(() => genericStore.getState('favorite').isLoading);
  // #endregion

  // #region Methods
  const loadFavorites = async () => {
    if (!currentPersonStore.person || !currentPersonStore.person.handle) return;
    const favoriteRes = await ApiGenericService.find<FavoriteItem>('favorite', {
      filter: { person: { handle: currentPersonStore.person.handle } },
    });
    favorites.value = favoriteRes.data || [];
  };

  const loadEntities = async () => {
    entities.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { canShow: true } })).data;
  };

  const validateAndAddFavorite = async () => {
    const valid = await favoriteFormRef?.value?.validate();
    if (valid) {
      await addFavorite();
    }
  };

  const openAddFavoriteDialog = () => {
    newFavoriteTitle.value = '';
    selectedFavoriteEntity.value = null;
    addFavoriteDialog.value = true;
  };

  const addFavorite = async () => {
    if (newFavoriteTitle.value && selectedFavoriteEntity?.value && currentPersonStore.person) {
      const item = {
        title: newFavoriteTitle.value,
        entity: selectedFavoriteEntity.value.handle,
        person: currentPersonStore.person.handle,
        createdAt: new Date(),
      } as FavoriteItem;
      await ApiGenericService.create<FavoriteItem>('favorite', item);
      favorites.value.push(item);
      addFavoriteDialog.value = false;
    }
  };

  const removeFavorite = async (idx: number) => {
    const favorite = favorites.value[idx];
    if (favorite && favorite.handle != null) {
      await ApiGenericService.delete('favorite', favorite.handle);
    }
    favorites.value.splice(idx, 1);
  };

  const goToFavorite = (favorite: FavoriteItem) => {
    if (favorite.entity) {
      let path = `table/${favorite.entity}`;
      if (favorite.filter) {
        path += `?filter=${encodeURIComponent(JSON.stringify(favorite.filter))}`;
      }
      router.push(path);
    }
  };
  // #endregion

  // #region Lifecycle
  onMounted(async () => {
    await loadFavorites();
    await loadEntities();
  });
  // #endregion

  // #region Store Init
  // Load the generic store data for the 'favorite' entity
  genericStore.loadGeneric('favorite', 'global');
  // #endregion

  // #region Return
  return {
    entity,
    isLoading,
    favoriteFormRef,
    addFavoriteDialog,
    newFavoriteTitle,
    selectedFavoriteEntity,
    entities,
    favorites,
    entityOptions,
    loadFavorites,
    loadEntities,
    validateAndAddFavorite,
    openAddFavoriteDialog,
    addFavorite,
    removeFavorite,
    goToFavorite,
  };
  // #endregion
}
