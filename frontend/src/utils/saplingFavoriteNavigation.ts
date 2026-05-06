import type { EntityItem, FavoriteItem, PersonItem } from '@/entity/entity'

import { resolveDynamicFilter } from './saplingDynamicFilter'

type FavoritePathContext = {
  currentPerson?: PersonItem | null
}

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

  const inlineEntityDefinition = isEntityItem(favorite.entity) ? favorite.entity : null
  const entityDefinition = inlineEntityDefinition?.routes?.length
    ? inlineEntityDefinition
    : (entities.find((entry) => entry.handle === entityHandle) ?? inlineEntityDefinition)

  const configuredRoutes =
    entityDefinition?.routes?.filter((entry) => {
      return typeof entry.route === 'string' && entry.route.length > 0
    }) ?? []

  const configuredRoute =
    configuredRoutes.find((entry) => entry.navigation == null)?.route ?? configuredRoutes[0]?.route

  return configuredRoute || `table/${entityHandle}`
}

export function buildFavoritePath(
  favorite: FavoriteItem,
  entities: EntityItem[] = [],
  context: FavoritePathContext = {},
): string | null {
  const route = getConfiguredFavoriteRoute(favorite, entities)
  if (!route) {
    return null
  }

  const normalizedPath = route.startsWith('/') ? route : `/${route}`

  if (!favorite.filter) {
    return normalizedPath
  }

  const serializedFilter = serializeFavoriteFilter(favorite.filter, context)

  return `${normalizedPath}?filter=${encodeURIComponent(serializedFilter)}`
}

function serializeFavoriteFilter(
  filter: FavoriteItem['filter'],
  context: FavoritePathContext,
): string {
  if (typeof filter === 'string') {
    try {
      return JSON.stringify(resolveDynamicFilter(JSON.parse(filter), context))
    } catch {
      return filter
    }
  }

  return JSON.stringify(resolveDynamicFilter(filter, context))
}
