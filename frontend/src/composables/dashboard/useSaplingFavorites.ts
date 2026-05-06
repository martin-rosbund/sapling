import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ApiGenericService from '@/services/api.generic.service'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore'
import type {
  FavoriteItem,
  FavoriteTemplateItem,
  EntityItem,
  EntityRouteItem,
} from '../../entity/entity'
import { useGenericStore } from '@/stores/genericStore'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import { buildFavoritePath } from '@/utils/saplingFavoriteNavigation'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'

const FAVORITE_ENTITY_HANDLE = 'favorite'
const FAVORITE_TEMPLATE_ENTITY_HANDLE = 'favoriteTemplate'

export function useSaplingFavoritesAccess() {
  const currentPermissionStore = useCurrentPermissionStore()

  async function ensurePermissionsLoaded() {
    await currentPermissionStore.fetchCurrentPermission()
  }

  const hasFavoritesAccess = computed(() => {
    return hasEntityReadPermission(FAVORITE_ENTITY_HANDLE)
  })
  const hasFavoriteTemplateAccess = computed(() => {
    return hasEntityReadPermission(FAVORITE_TEMPLATE_ENTITY_HANDLE)
  })

  async function ensureFavoritesAccess() {
    await ensurePermissionsLoaded()

    return hasFavoritesAccess.value
  }

  async function ensureFavoriteTemplateAccess() {
    await ensurePermissionsLoaded()

    return hasFavoriteTemplateAccess.value
  }

  function hasEntityReadPermission(entityHandle: string) {
    const permissions = currentPermissionStore.accumulatedPermission

    if (!currentPermissionStore.loaded || !permissions) {
      return false
    }

    return permissions.some(
      (permission) => permission.entityHandle === entityHandle && permission.allowRead,
    )
  }

  return {
    hasFavoritesAccess,
    hasFavoriteTemplateAccess,
    ensureFavoritesAccess,
    ensureFavoriteTemplateAccess,
  }
}

/**
 * Encapsulates favorite drawer state, loading and favorite CRUD behaviour.
 */
export function useSaplingFavorites() {
  // #region State & Refs
  const entities = ref<EntityItem[]>([])
  const favorites = ref<FavoriteItem[]>([])
  const favoriteTemplates = ref<FavoriteTemplateItem[]>([])
  const favoriteTemplateLoadDialog = ref(false)
  const loadingFavoriteTemplateHandle = ref<FavoriteTemplateItem['handle'] | null>(null)
  const isFavoritesLoading = ref(true)
  const isEntitiesLoading = ref(true)
  const isFavoriteTemplatesLoading = ref(true)
  const currentPersonStore = useCurrentPersonStore()
  const router = useRouter()
  const genericStore = useGenericStore()
  const { pushMessage } = useSaplingMessageCenter()
  const { isLoading: isNavigationTranslationLoading } = useTranslationLoader(
    'navigation',
    'favorite',
  )
  const {
    hasFavoritesAccess,
    hasFavoriteTemplateAccess,
    ensureFavoritesAccess,
    ensureFavoriteTemplateAccess,
  } = useSaplingFavoritesAccess()
  // #endregion

  // #region Computed
  const isLoading = computed(() => {
    return (
      isNavigationTranslationLoading.value ||
      isFavoritesLoading.value ||
      isEntitiesLoading.value ||
      isFavoriteTemplatesLoading.value ||
      genericStore.getState(FAVORITE_ENTITY_HANDLE).isLoading
    )
  })
  const entity = computed(() => genericStore.getState(FAVORITE_ENTITY_HANDLE).entity)
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

      const favoriteRes = await ApiGenericService.find<FavoriteItem>(FAVORITE_ENTITY_HANDLE, {
        filter: { person: { handle: currentPersonStore.person.handle } },
        relations: ['entity', 'entityRoute'],
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
    const hasAnyAccess = (await ensureFavoritesAccess()) || (await ensureFavoriteTemplateAccess())

    if (!hasAnyAccess) {
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
            relations: ['routes'],
          })
        ).data || []
    } finally {
      isEntitiesLoading.value = false
    }
  }

  /**
   * Loads all favorite templates visible to the current user.
   */
  async function loadFavoriteTemplates() {
    if (!(await ensureFavoriteTemplateAccess())) {
      favoriteTemplates.value = []
      isFavoriteTemplatesLoading.value = false
      return
    }

    isFavoriteTemplatesLoading.value = true

    try {
      const favoriteTemplateRes = await ApiGenericService.find<FavoriteTemplateItem>(
        FAVORITE_TEMPLATE_ENTITY_HANDLE,
        {
          orderBy: { isRecommended: 'DESC', name: 'ASC' },
          relations: ['entity', 'entityRoute'],
        },
      )

      favoriteTemplates.value = favoriteTemplateRes.data || []
    } finally {
      isFavoriteTemplatesLoading.value = false
    }
  }

  /**
   * Opens the favorite-template picker and refreshes the available templates first.
   */
  async function openFavoriteTemplateLoadDialog() {
    if (!(await ensureFavoriteTemplateAccess())) {
      return
    }

    await loadFavoriteTemplates()
    favoriteTemplateLoadDialog.value = true
  }

  /**
   * Creates a new personal favorite from a saved template.
   */
  async function loadFavoriteFromTemplate(template: FavoriteTemplateItem) {
    if (!(await ensureFavoritesAccess()) || !(await ensureFavoriteTemplateAccess())) {
      return
    }

    await ensureCurrentPersonLoaded()
    if (!currentPersonStore.person?.handle || template.handle == null) {
      return
    }

    loadingFavoriteTemplateHandle.value = template.handle

    try {
      const createdFavorite = await ApiGenericService.create<FavoriteItem>(FAVORITE_ENTITY_HANDLE, {
        title: template.name,
        entity: getEntityHandle(template.entity),
        entityRoute:
          getEntityRouteHandle(template.entityRoute) ??
          resolveDefaultTableRouteHandle(template.entity, entities.value),
        person: currentPersonStore.person.handle,
        filter: normalizeFilter(template.filter),
      })

      favorites.value.push({
        ...createdFavorite,
        entity: createdFavorite.entity ?? resolveTemplateEntity(template),
        entityRoute:
          createdFavorite.entityRoute ??
          resolveTemplateEntityRoute(template, entities.value) ??
          null,
      })

      favoriteTemplateLoadDialog.value = false
      pushMessage(
        'success',
        'global.favoriteSaved',
        'global.favoriteSavedDescription',
        FAVORITE_ENTITY_HANDLE,
      )
    } finally {
      loadingFavoriteTemplateHandle.value = null
    }
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
      await ApiGenericService.delete(FAVORITE_ENTITY_HANDLE, favorite.handle)
    }

    favorites.value.splice(favoriteIndex, 1)
  }

  function navigateToFavoriteTarget(target: FavoriteItem | FavoriteTemplateItem) {
    const path = buildFavoritePath(target, entities.value)
    if (!path) {
      return
    }

    router.push(path)
  }

  /**
   * Navigates to the table route behind a stored favorite, including an optional serialized filter.
   */
  function goToFavorite(favorite: FavoriteItem) {
    if (!hasFavoritesAccess.value) {
      return
    }

    navigateToFavoriteTarget(favorite)
  }

  /**
   * Navigates directly to a saved template without creating a personal favorite first.
   */
  function goToFavoriteTemplate(template: FavoriteTemplateItem) {
    if (!hasFavoriteTemplateAccess.value) {
      return
    }

    navigateToFavoriteTarget(template)
  }
  // #endregion

  // #region Lifecycle
  onMounted(async () => {
    const favoritesAccess = await ensureFavoritesAccess()
    const favoriteTemplateAccess = await ensureFavoriteTemplateAccess()

    if (!favoritesAccess && !favoriteTemplateAccess) {
      isFavoritesLoading.value = false
      isEntitiesLoading.value = false
      isFavoriteTemplatesLoading.value = false
      favorites.value = []
      favoriteTemplates.value = []
      entities.value = []
      return
    }

    if (favoritesAccess) {
      void genericStore.loadGeneric(FAVORITE_ENTITY_HANDLE, 'global')
    }

    await Promise.all([loadFavorites(), loadEntities(), loadFavoriteTemplates()])
  })
  // #endregion

  // #region Return
  return {
    entity,
    isLoading,
    hasFavoritesAccess,
    hasFavoriteTemplateAccess,
    favorites,
    favoriteTemplates,
    favoriteTemplateLoadDialog,
    loadingFavoriteTemplateHandle,
    openFavoriteTemplateLoadDialog,
    loadFavoriteFromTemplate,
    goToFavoriteTemplate,
    removeFavorite,
    goToFavorite,
  }
  // #endregion
}

function getEntityHandle(entity: FavoriteTemplateItem['entity']) {
  return typeof entity === 'string' ? entity : (entity?.handle ?? '')
}

function normalizeFilter(filter: FavoriteTemplateItem['filter']) {
  if (typeof filter === 'string') {
    try {
      return JSON.parse(filter) as Record<string, unknown>
    } catch {
      return undefined
    }
  }

  return filter ?? undefined
}

function resolveTemplateEntity(template: FavoriteTemplateItem) {
  return template.entity ?? null
}

function getEntityRouteHandle(entityRoute: FavoriteTemplateItem['entityRoute']) {
  if (typeof entityRoute === 'number') {
    return entityRoute
  }

  return entityRoute?.handle ?? undefined
}

function resolveDefaultTableRouteHandle(
  entity: FavoriteTemplateItem['entity'],
  entities: EntityItem[],
) {
  return resolveDefaultTableRoute(entity, entities)?.handle ?? undefined
}

function resolveTemplateEntityRoute(template: FavoriteTemplateItem, entities: EntityItem[]) {
  if (typeof template.entityRoute === 'number') {
    return resolveEntityRouteByHandle(template.entityRoute, entities)
  }

  return template.entityRoute ?? resolveDefaultTableRoute(template.entity, entities) ?? null
}

function resolveDefaultTableRoute(entity: FavoriteTemplateItem['entity'], entities: EntityItem[]) {
  const entityHandle = getEntityHandle(entity)
  if (!entityHandle) {
    return null
  }

  const entityDefinition =
    (typeof entity === 'object' && entity?.handle ? entity : null) ??
    entities.find((entry) => entry.handle === entityHandle) ??
    null

  return entityDefinition?.routes?.find((entry) => entry.route === `table/${entityHandle}`) ?? null
}

function resolveEntityRouteByHandle(
  handle: number,
  entities: EntityItem[],
): EntityRouteItem | null {
  for (const entity of entities) {
    const entityRoute = entity.routes?.find((entry) => entry.handle === handle)
    if (entityRoute) {
      return entityRoute
    }
  }

  return null
}
