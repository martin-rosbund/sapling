import type {
  EntityItem,
  EntityRouteItem,
  FavoriteItem,
  FavoriteTemplateItem,
} from '@/entity/entity'

type FavoriteNavigationTarget = {
  entity: FavoriteItem['entity'] | FavoriteTemplateItem['entity']
  entityRoute?: FavoriteItem['entityRoute'] | FavoriteTemplateItem['entityRoute']
  filter?: FavoriteItem['filter'] | FavoriteTemplateItem['filter']
}

function isEntityItem(value: FavoriteItem['entity']): value is EntityItem {
  return value !== null && typeof value === 'object' && typeof value.handle === 'string'
}

function isEntityRouteItem(
  value: FavoriteNavigationTarget['entityRoute'],
): value is EntityRouteItem {
  return (
    value !== null &&
    typeof value === 'object' &&
    (value.handle == null || typeof value.handle === 'number')
  )
}

export function getFavoriteEntityHandle(entity: FavoriteItem['entity']): string | null {
  if (typeof entity === 'string' && entity.length > 0) {
    return entity
  }

  if (isEntityItem(entity) && entity.handle.length > 0) {
    return entity.handle
  }

  return null
}

function getConfiguredFavoriteRoute(
  favorite: FavoriteNavigationTarget,
  entities: EntityItem[] = [],
): string | null {
  const configuredRoute = resolveConfiguredEntityRoute(favorite.entityRoute, entities)
  if (configuredRoute) {
    return configuredRoute
  }

  const entityHandle = getFavoriteEntityHandle(favorite.entity)
  if (!entityHandle) {
    return null
  }

  return `table/${entityHandle}`
}

export function buildFavoritePath(
  favorite: FavoriteNavigationTarget,
  entities: EntityItem[] = [],
): string | null {
  const route = getConfiguredFavoriteRoute(favorite, entities)
  if (!route) {
    return null
  }

  const normalizedPath = route.startsWith('/') ? route : `/${route}`

  if (!favorite.filter) {
    return normalizedPath
  }

  const serializedFilter = serializeFavoriteFilter(favorite.filter)

  return `${normalizedPath}?filter=${encodeURIComponent(serializedFilter)}`
}

function serializeFavoriteFilter(filter: FavoriteNavigationTarget['filter']): string {
  if (typeof filter === 'string') {
    return filter
  }

  return JSON.stringify(filter)
}

function resolveConfiguredEntityRoute(
  entityRoute: FavoriteNavigationTarget['entityRoute'],
  entities: EntityItem[],
) {
  if (
    isEntityRouteItem(entityRoute) &&
    typeof entityRoute.route === 'string' &&
    entityRoute.route
  ) {
    return entityRoute.route
  }

  if (isEntityRouteItem(entityRoute) && typeof entityRoute.handle === 'number') {
    return resolveRouteByHandle(entityRoute.handle, entities)
  }

  if (typeof entityRoute !== 'number') {
    return null
  }

  return resolveRouteByHandle(entityRoute, entities)
}

function resolveRouteByHandle(handle: number, entities: EntityItem[]) {
  for (const entity of entities) {
    const matchingRoute = entity.routes?.find((entry) => entry.handle === handle)
    if (matchingRoute?.route) {
      return matchingRoute.route
    }
  }

  return null
}
