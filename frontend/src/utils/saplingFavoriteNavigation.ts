import type {
  EntityItem,
  EntityRouteItem,
  FavoriteItem,
  FavoriteTemplateItem,
} from '@/entity/entity'

type FavoriteNavigationTarget = {
  entity: FavoriteItem['entity'] | FavoriteTemplateItem['entity']
  entityRoute?: FavoriteItem['entityRoute'] | FavoriteTemplateItem['entityRoute']
  search?: FavoriteItem['search']
  sortBy?: FavoriteItem['sortBy']
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
  const queryParts: string[] = []

  if (typeof favorite.search === 'string' && favorite.search.trim().length > 0) {
    queryParts.push(`search=${encodeURIComponent(favorite.search)}`)
  }

  if (Array.isArray(favorite.sortBy) && favorite.sortBy.length > 0) {
    queryParts.push(`sortBy=${encodeURIComponent(JSON.stringify(favorite.sortBy))}`)
  }

  if (favorite.filter) {
    const serializedFilter = serializeFavoriteFilter(favorite.filter)
    queryParts.push(`filter=${encodeURIComponent(serializedFilter)}`)
  }

  if (queryParts.length === 0) {
    return normalizedPath
  }

  return `${normalizedPath}?${queryParts.join('&')}`
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
