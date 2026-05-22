import { describe, expect, it, vi } from 'vitest'
import { resolveApiError } from '../api.error.service'

vi.mock('@/composables/system/useSaplingMessageCenter', () => ({
  useSaplingMessageCenter: () => ({
    pushMessage: vi.fn(),
  }),
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    clear: vi.fn(),
  }),
}))

describe('api.error.service', () => {
  it('uses structured backend details for actionable descriptions', () => {
    const result = resolveApiError(
      {
        response: {
          status: 409,
          data: {
            message: 'global.deleteError',
            error:
              'Der Datensatz kann nicht geloescht werden, weil er noch von "favorite_item" verwendet wird.',
            details: {
              summary:
                'Der Datensatz kann nicht geloescht werden, weil er noch von "favorite_item" verwendet wird.',
              referencingTable: 'favorite_item',
            },
            technical: {
              exception: {
                code: '23503',
                constraint: 'favorite_item_person_handle_foreign',
              },
            },
          },
        },
        config: {
          method: 'delete',
          url: '/api/generic/person',
          params: { handle: 113 },
        },
      },
      'exception.unknownError',
    )

    expect(result.message).toBe('global.deleteError')
    expect(result.description).toContain('favorite_item')
    expect(result.technical).toMatchObject({
      client: {
        method: 'delete',
        url: '/api/generic/person',
        params: { handle: 113 },
      },
      response: {
        status: 409,
        data: {
          technical: {
            exception: {
              code: '23503',
            },
          },
        },
      },
    })
  })
})
