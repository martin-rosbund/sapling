import { describe, expect, it } from 'vitest'

import type { EntityItem, EntityRouteItem, FavoriteItem } from '@/entity/entity'

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
    entityRoute: null,
    createdAt: null,
    ...overrides,
  }
}

function createEntityRoute(overrides: Partial<EntityRouteItem> = {}): EntityRouteItem {
  return {
    handle: 1,
    route: 'table/company',
    navigation: null,
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
      entityRoute: createEntityRoute(),
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

  it('uses loaded entity definitions when only an entityRoute handle is available', () => {
    const favorite = createFavorite({
      entity: 'favorite',
      entityRoute: 42,
      filter: '{"mine":true}',
    })
    const entities = [
      createEntity({
        handle: 'favorite',
        routes: [createEntityRoute({ handle: 42, route: 'table/favorite' })],
      }),
    ]

    expect(buildFavoritePath(favorite, entities)).toBe(
      '/table/favorite?filter=%7B%22mine%22%3Atrue%7D',
    )
  })

  it('falls back to the standard table route when no configured entity route exists', () => {
    const favorite = createFavorite({
      entity: createEntity({
        handle: 'ticket',
        routes: [],
      }),
    })

    expect(buildFavoritePath(favorite)).toBe('/table/ticket')
  })

  it('prefers the explicit entityRoute over inline entity route metadata', () => {
    const favorite = createFavorite({
      entityRoute: createEntityRoute({ route: 'table/event', handle: 18 }),
      entity: createEntity({
        handle: 'event',
        routes: [
          createEntityRoute({ route: 'event', navigation: 'calendar', handle: 19 }),
          createEntityRoute({ route: 'partner/event', navigation: null, handle: 20 }),
        ],
      }),
    })

    expect(buildFavoritePath(favorite)).toBe('/table/event')
  })

  it('passes object filter placeholders through unchanged', () => {
    const favorite = createFavorite({
      entityRoute: createEntityRoute({ route: 'table/ticket' }),
      filter: {
        status: { handle: 'open' },
        assigneePerson: { handle: '{{currentUser.handle}}' },
      },
    })

    expect(buildFavoritePath(favorite)).toBe(
      '/table/ticket?filter=%7B%22status%22%3A%7B%22handle%22%3A%22open%22%7D%2C%22assigneePerson%22%3A%7B%22handle%22%3A%22%7B%7BcurrentUser.handle%7D%7D%22%7D%7D',
    )
  })

  it('passes JSON string filter placeholders through unchanged', () => {
    const favorite = createFavorite({
      entityRoute: createEntityRoute({ route: 'table/ticket' }),
      filter: '{"status":{"handle":"open"},"assigneePerson":{"handle":"{{currentUser.handle}}"}}',
    })

    expect(buildFavoritePath(favorite)).toBe(
      '/table/ticket?filter=%7B%22status%22%3A%7B%22handle%22%3A%22open%22%7D%2C%22assigneePerson%22%3A%7B%22handle%22%3A%22%7B%7BcurrentUser.handle%7D%7D%22%7D%7D',
    )
  })

  it('includes persisted search and sorting context in the favorite path', () => {
    const favorite = createFavorite({
      entityRoute: createEntityRoute({ route: 'table/ticket' }),
      search: 'Ada',
      sortBy: [
        { key: 'deadlineDate', order: 'asc' },
        { key: 'priority', order: 'desc' },
      ],
      filter: { status: { handle: 'open' } },
    })

    expect(buildFavoritePath(favorite)).toBe(
      '/table/ticket?search=Ada&sortBy=%5B%7B%22key%22%3A%22deadlineDate%22%2C%22order%22%3A%22asc%22%7D%2C%7B%22key%22%3A%22priority%22%2C%22order%22%3A%22desc%22%7D%5D&filter=%7B%22status%22%3A%7B%22handle%22%3A%22open%22%7D%7D',
    )
  })
})
