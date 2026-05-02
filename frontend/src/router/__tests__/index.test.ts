import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockAuthStore = {
  validate: vi.fn<() => Promise<boolean>>(),
}

const mockCurrentPersonStore = {
  person: null as { roles?: unknown[] } | null,
  fetchCurrentPerson: vi.fn<() => Promise<void>>(),
}

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => mockAuthStore,
}))

vi.mock('@/stores/currentPersonStore', () => ({
  useCurrentPersonStore: () => mockCurrentPersonStore,
}))

vi.mock('@/views/HomeView.vue', () => ({
  default: {},
}))

vi.mock('@/views/AccessPendingView.vue', () => ({
  default: {},
}))

vi.mock('@/views/LoginView.vue', () => ({
  default: {},
}))

import router from '@/router'

describe('router access pending redirect', () => {
  beforeEach(async () => {
    mockAuthStore.validate.mockResolvedValue(true)
    mockCurrentPersonStore.fetchCurrentPerson.mockResolvedValue()
    mockCurrentPersonStore.person = { roles: [{ handle: 1 }] }

    await router.replace('/login')
    vi.clearAllMocks()
  })

  it('registers the access pending route', () => {
    expect(router.resolve('/access-pending').name).toBe('accessPending')
  })

  it('redirects unauthenticated users to login', async () => {
    mockAuthStore.validate.mockResolvedValue(false)

    await router.push('/')

    expect(router.currentRoute.value.name).toBe('login')
    expect(mockCurrentPersonStore.fetchCurrentPerson).not.toHaveBeenCalled()
  })

  it('redirects authenticated users without roles to access pending', async () => {
    mockCurrentPersonStore.person = { roles: [] }

    await router.push('/')

    expect(router.currentRoute.value.name).toBe('accessPending')
    expect(mockAuthStore.validate).toHaveBeenCalled()
    expect(mockCurrentPersonStore.fetchCurrentPerson).toHaveBeenCalled()
  })

  it('redirects users with roles away from access pending', async () => {
    mockCurrentPersonStore.person = { roles: [{ handle: 1 }] }

    await router.push('/access-pending')

    expect(router.currentRoute.value.name).toBe('home')
  })
})
