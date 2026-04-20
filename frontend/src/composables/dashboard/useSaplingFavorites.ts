import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ApiGenericService from '@/services/api.generic.service'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore'
import { i18n } from '@/i18n'
import type { FavoriteItem, EntityItem } from '../../entity/entity'
import { useGenericStore } from '@/stores/genericStore'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'

interface FavoriteEntityOption extends EntityItem {
  title: string
}

const FAVORITE_ENTITY_HANDLE = 'favorite'

export function useSaplingFavoritesAccess() {
  const currentPermissionStore = useCurrentPermissionStore()

  const hasFavoritesAccess = computed(() => {
    const permissions = currentPermissionStore.accumulatedPermission

    if (!currentPermissionStore.loaded || !permissions) {
      return false
    }

    return permissions.some(
      (permission) => permission.entityHandle === FAVORITE_ENTITY_HANDLE && permission.allowRead,
    )
  })

  async function ensureFavoritesAccess() {
    await currentPermissionStore.fetchCurrentPermission()

    return hasFavoritesAccess.value
  }

  void ensureFavoritesAccess()

  return {
    hasFavoritesAccess,
    ensureFavoritesAccess,
  }
}

/**
 * Encapsulates favorite drawer state, loading and favorite CRUD behaviour.
 */
export function useSaplingFavorites() {
  // #region State & Refs
  const addFavoriteDialog = ref(false)
  const newFavoriteTitle = ref('')
  const selectedFavoriteEntity = ref<EntityItem | null>(null)
  const entities = ref<EntityItem[]>([])
  const favorites = ref<FavoriteItem[]>([])
  const isFavoritesLoading = ref(true)
  const isEntitiesLoading = ref(true)
  const currentPersonStore = useCurrentPersonStore()
  const router = useRouter()
  const genericStore = useGenericStore()
  const { isLoading: isNavigationTranslationLoading } = useTranslationLoader('navigation')
  const { hasFavoritesAccess, ensureFavoritesAccess } = useSaplingFavoritesAccess()
  // #endregion

  // #region Computed
  const isLoading = computed(() => {
    return (
      isNavigationTranslationLoading.value ||
      isFavoritesLoading.value ||
      isEntitiesLoading.value ||
      genericStore.getState('favorite').isLoading
    )
  })
  const entityOptions = computed<FavoriteEntityOption[]>(() => {
    return entities.value.map((entityEntry) => ({
      ...entityEntry,
      title: getEntityTitle(entityEntry),
    }))
  })
  const entity = computed(() => genericStore.getState('favorite').entity)
  // #endregion

  // #region Methods
  /**
   * Ensures that the current person is available before person-scoped favorite requests run.
   */
  async function ensureCurrentPersonLoaded() {
    if (currentPersonStore.person?.handle) {
      return
    }

    await currentPersonStore.fetchCurrentPerson()
  }

  /**
   * Loads the current person's favorites.
   */
  async function loadFavorites() {
    if (!(await ensureFavoritesAccess())) {
      favorites.value = []
      isFavoritesLoading.value = false
      return
    }

    isFavoritesLoading.value = true

    await ensureCurrentPersonLoaded()

    try {
      if (!currentPersonStore.person || !currentPersonStore.person.handle) {
        favorites.value = []
        return
      }

      const favoriteRes = await ApiGenericService.find<FavoriteItem>('favorite', {
        filter: { person: { handle: currentPersonStore.person.handle } },
      })
      favorites.value = favoriteRes.data || []
    } finally {
      isFavoritesLoading.value = false
    }
  }

  /**
   * Loads all entities that can be targeted by a favorite.
   */
  async function loadEntities() {
    if (!(await ensureFavoritesAccess())) {
      entities.value = []
      isEntitiesLoading.value = false
      return
    }

    isEntitiesLoading.value = true

    try {
      entities.value =
        (
          await ApiGenericService.find<EntityItem>('entity', {
            filter: { canShow: true },
          })
        ).data || []
    } finally {
      isEntitiesLoading.value = false
    }
  }

  function getEntityTitle(entityEntry: EntityItem) {
    const key = `navigation.${entityEntry.handle}`
    if (!isLoading.value && i18n.global.te(key)) {
      return i18n.global.t(key)
    }

    return humanizeHandle(entityEntry.handle)
  }

  function humanizeHandle(handle: string) {
    return handle
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[._-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (character) => character.toUpperCase())
  }

  /**
   * Resets the add-favorite form state.
   */
  function resetFavoriteForm() {
    newFavoriteTitle.value = ''
    selectedFavoriteEntity.value = null
  }

  /**
   * Synchronizes the add-favorite dialog state.
   */
  function updateAddFavoriteDialog(value: boolean) {
    addFavoriteDialog.value = value

    if (!value) {
      resetFavoriteForm()
    }
  }

  /**
   * Synchronizes the favorite title input.
   */
  function updateNewFavoriteTitle(value: string) {
    newFavoriteTitle.value = value
  }

  /**
   * Synchronizes the selected favorite entity.
   */
  function updateSelectedFavoriteEntity(value: EntityItem | null) {
    selectedFavoriteEntity.value = value
  }

  /**
   * Opens the add-favorite dialog with a clean form state.
   */
  function openAddFavoriteDialog() {
    if (!hasFavoritesAccess.value) {
      return
    }

    resetFavoriteForm()
    addFavoriteDialog.value = true
  }

  /**
   * Creates a new favorite and appends the persisted API payload to the local list.
   */
  async function addFavorite() {
    if (!(await ensureFavoritesAccess())) {
      return
    }

    await ensureCurrentPersonLoaded()

    if (
      !newFavoriteTitle.value ||
      !selectedFavoriteEntity.value ||
      !currentPersonStore.person?.handle
    ) {
      return
    }

    const createdFavorite = await ApiGenericService.create<FavoriteItem>('favorite', {
      title: newFavoriteTitle.value,
      entity: selectedFavoriteEntity.value.handle,
      person: currentPersonStore.person.handle,
      createdAt: new Date(),
    } as FavoriteItem)

    favorites.value.push({
      ...createdFavorite,
      entity: createdFavorite.entity ?? selectedFavoriteEntity.value,
    })

    updateAddFavoriteDialog(false)
  }

  /**
   * Removes a favorite from the backend and local list.
   */
  async function removeFavorite(favorite: FavoriteItem) {
    if (!(await ensureFavoritesAccess())) {
      return
    }

    const favoriteIndex = favorites.value.findIndex((entry) => entry.handle === favorite.handle)

    if (favoriteIndex === -1) {
      return
    }

    if (favorite.handle != null) {
      await ApiGenericService.delete('favorite', favorite.handle)
    }

    favorites.value.splice(favoriteIndex, 1)
  }

  /**
   * Navigates to the table route behind a stored favorite, including an optional serialized filter.
   */
  function goToFavorite(favorite: FavoriteItem) {
    if (!hasFavoritesAccess.value) {
      return
    }

    const entityHandle =
      favorite.entity && typeof favorite.entity === 'object'
        ? favorite.entity.handle
        : favorite.entity

    if (!entityHandle) {
      return
    }

    let path = `table/${entityHandle}`
    if (favorite.filter) {
      const serializedFilter =
        typeof favorite.filter === 'string' ? favorite.filter : JSON.stringify(favorite.filter)
      path += `?filter=${encodeURIComponent(serializedFilter)}`
    }

    router.push(path)
  }
  // #endregion

  // #region Lifecycle
  onMounted(async () => {
    if (!(await ensureFavoritesAccess())) {
      isFavoritesLoading.value = false
      isEntitiesLoading.value = false
      favorites.value = []
      entities.value = []
      return
    }

    genericStore.loadGeneric(FAVORITE_ENTITY_HANDLE, 'global')
    await Promise.all([loadFavorites(), loadEntities()])
  })
  // #endregion

  // #region Return
  return {
    entity,
    isLoading,
    hasFavoritesAccess,
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
  }
  // #endregion
}
