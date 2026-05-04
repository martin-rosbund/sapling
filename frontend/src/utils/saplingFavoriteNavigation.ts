import type { EntityItem, FavoriteItem } from '@/entity/entity'

function isEntityItem(value: FavoriteItem['entity']): value is EntityItem {
  return value !== null && typeof value === 'object' && typeof value.handle === 'string'
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
  favorite: FavoriteItem,
  entities: EntityItem[] = [],
): string | null {
  const entityHandle = getFavoriteEntityHandle(favorite.entity)
  if (!entityHandle) {
    return null
  }

  const entityDefinition = isEntityItem(favorite.entity)
    ? favorite.entity
    : entities.find((entry) => entry.handle === entityHandle)

  const configuredRoute = entityDefinition?.routes?.find((entry) => {
    return typeof entry.route === 'string' && entry.route.length > 0
  })?.route

  return configuredRoute || `table/${entityHandle}`
}

export function buildFavoritePath(favorite: FavoriteItem, entities: EntityItem[] = []): string | null {
  const route = getConfiguredFavoriteRoute(favorite, entities)
  if (!route) {
    return null
  }

  const normalizedPath = route.startsWith('/') ? route : `/${route}`

  if (!favorite.filter) {
    return normalizedPath
  }

  const serializedFilter =
    typeof favorite.filter === 'string' ? favorite.filter : JSON.stringify(favorite.filter)

  return `${normalizedPath}?filter=${encodeURIComponent(serializedFilter)}`
}
