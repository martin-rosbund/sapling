import { describe, expect, it } from 'vitest'

import type { EntityItem, FavoriteItem } from '@/entity/entity'

import { buildFavoritePath, getFavoriteEntityHandle } from '../saplingFavoriteNavigation'

function createEntity(overrides: Partial<EntityItem> = {}): EntityItem {
  return {
    handle: 'company',
    icon: null,
    canRead: true,
    createdAt: null,
    ...overrides,
  }
}

function createFavorite(overrides: Partial<FavoriteItem> = {}): FavoriteItem {
  return {
    handle: 1,
    title: 'Company overview',
    person: 1,
    entity: 'company',
    createdAt: null,
    ...overrides,
  }
}

describe('saplingFavoriteNavigation', () => {
  it('resolves entity handles from strings and entity objects', () => {
    expect(getFavoriteEntityHandle('company')).toBe('company')
    expect(getFavoriteEntityHandle(createEntity({ handle: 'ticket' }))).toBe('ticket')
    expect(getFavoriteEntityHandle(null)).toBeNull()
  })

  it('builds a root-relative path from the configured entity route', () => {
    const favorite = createFavorite({
      entity: createEntity({
        handle: 'company',
        routes: [{ route: 'table/company', navigation: null, createdAt: null }],
      }),
      filter: { status: 'active' },
    })

    expect(buildFavoritePath(favorite)).toBe(
      '/table/company?filter=%7B%22status%22%3A%22active%22%7D',
    )
  })

  it('falls back to a table route when no entity route metadata is available', () => {
    const favorite = createFavorite({ entity: 'company' })

    expect(buildFavoritePath(favorite)).toBe('/table/company')
  })

  it('uses loaded entity definitions when the favorite only stores the entity handle', () => {
    const favorite = createFavorite({
      entity: 'favorite',
      filter: '{"mine":true}',
    })
    const entities = [
      createEntity({
        handle: 'favorite',
        routes: [{ route: 'partner/favorite', navigation: null, createdAt: null }],
      }),
    ]

    expect(buildFavoritePath(favorite, entities)).toBe(
      '/partner/favorite?filter=%7B%22mine%22%3Atrue%7D',
    )
  })

  it('falls back to loaded entity definitions when an inline entity misses route metadata', () => {
    const favorite = createFavorite({
      entity: createEntity({
        handle: 'ticket',
        routes: [],
      }),
    })
    const entities = [
      createEntity({
        handle: 'ticket',
        routes: [{ route: 'partner/ticket', navigation: null, createdAt: null }],
      }),
    ]

    expect(buildFavoritePath(favorite, entities)).toBe('/partner/ticket')
  })

  it('prefers worklist-friendly routes over navigation-specific routes', () => {
    const favorite = createFavorite({
      entity: createEntity({
        handle: 'event',
        routes: [
          { route: 'event', navigation: 'calendar', createdAt: null },
          { route: 'partner/event', navigation: null, createdAt: null },
        ],
      }),
    })

    expect(buildFavoritePath(favorite)).toBe('/partner/event')
  })
})
