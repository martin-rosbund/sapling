import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import ApiGenericService from '@/services/api.generic.service';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
import { i18n } from '@/i18n';
import type { FavoriteItem, EntityItem } from '../../entity/entity';
import { useGenericStore } from '@/stores/genericStore';

export function useSaplingFavorites() {
  //#region Refs
  const favoriteFormRef = ref<InstanceType<typeof HTMLFormElement> | null>(null);
  const addFavoriteDialog = ref(false);
  const newFavoriteTitle = ref('');
  const selectedFavoriteEntity = ref<EntityItem | null>(null);
  const router = useRouter();
  const entities = ref<EntityItem[]>([]);
  const favorites = ref<FavoriteItem[]>([]);
  const currentPersonStore = useCurrentPersonStore();
  // #endregion

  // #region Load
  async function loadFavorites() {
    if (!currentPersonStore.person || !currentPersonStore.person.handle) return;
    const favoriteRes = await ApiGenericService.find<FavoriteItem>('favorite', {
      filter: { person: { handle: currentPersonStore.person.handle } },
      relations: ['entity']
    });
    favorites.value = favoriteRes.data || [];
  }

  async function loadEntities() {
    entities.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { canShow: true } })).data;
  }
  // #endregion

  // #region Lifecycle
  onMounted(async () => {
    await loadFavorites();
    await loadEntities();
  });
  // #endregion

  // #region Methods
  async function validateAndAddFavorite() {
    const valid = await favoriteFormRef.value?.validate();
    if (valid) {
      await addFavorite();
    }
  }

  function openAddFavoriteDialog() {
    newFavoriteTitle.value = '';
    selectedFavoriteEntity.value = null;
    addFavoriteDialog.value = true;
  }

  async function addFavorite() {
    if (newFavoriteTitle.value && selectedFavoriteEntity.value && currentPersonStore.person) {
      const fav = await ApiGenericService.create<FavoriteItem>('favorite', {
        title: newFavoriteTitle.value,
        entity: selectedFavoriteEntity.value.handle,
        person: currentPersonStore.person.handle,
        createdAt: new Date(),
      });
      favorites.value.push(fav);
      addFavoriteDialog.value = false;
    }
  }

  async function removeFavorite(idx: number) {
    const fav = favorites.value[idx];
    if (fav && fav.handle) {
      await ApiGenericService.delete('favorite', { handle: fav.handle });
    }
    favorites.value.splice(idx, 1);
  }

  function goToFavorite(fav: FavoriteItem) {
    if (fav.entity && typeof fav.entity === 'object' && 'route' in fav.entity && typeof fav.entity.route === 'string') {
      let path = fav.entity.route;
      if (fav.filter) {
        path += `?filter=${fav.filter}`;
      }
      router.push(path);
    }
  }

  const entityOptions = computed(() =>
    entities.value.map(e => ({
      title: i18n.global.t(`navigation.${e.handle}`),
      value: e.handle,
      icon: e.icon
    }))
  );
  // #endregion

  // #region State

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
  //#endregion
}
