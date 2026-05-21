import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import axios from 'axios'

import { useAuthStore } from '../authStore'

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('reuses a fresh positive validation without hitting the backend again', async () => {
    const getSpy = vi.spyOn(axios, 'get').mockResolvedValue({
      status: 200,
      data: { authenticated: true },
    })

    const store = useAuthStore()

    await expect(store.validate()).resolves.toBe(true)
    await expect(store.validate()).resolves.toBe(true)

    expect(getSpy).toHaveBeenCalledTimes(1)
  })

  it('revalidates once the cached auth state becomes stale', async () => {
    const getSpy = vi.spyOn(axios, 'get').mockResolvedValue({
      status: 200,
      data: { authenticated: true },
    })

    const store = useAuthStore()

    await expect(store.validate()).resolves.toBe(true)
    store.lastValidatedAt = Date.now() - 5 * 60 * 1000

    await expect(store.validate()).resolves.toBe(true)

    expect(getSpy).toHaveBeenCalledTimes(2)
  })
})
