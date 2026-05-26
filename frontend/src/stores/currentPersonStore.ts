import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import ApiService from '@/services/api.service'
import type { PersonItem } from '../entity/entity'

export interface ImpersonatorInfo {
  handle: number
  firstName: string
  lastName: string
}

export const useCurrentPersonStore = defineStore('currentPerson', () => {
  const person = ref<PersonItem | null>(null)
  const loading = ref(false)
  const loaded = ref(false)
  let fetchPromise: Promise<void> | null = null

  const impersonator = computed<ImpersonatorInfo | null>(() => {
    const raw = (person.value as (PersonItem & { _impersonator?: ImpersonatorInfo }) | null)
      ?._impersonator
    return raw && typeof raw.handle === 'number' ? raw : null
  })

  const isImpersonating = computed(() => impersonator.value !== null)
  const isAdministrator = computed(
    () =>
      person.value?.roles?.some((role) => {
        if (!role || typeof role === 'string') {
          return false
        }

        return role.isAdministrator === true
      }) ?? false,
  )

  async function fetchCurrentPerson(force = false): Promise<void> {
    if (loaded.value && person.value && !force) return
    if (loading.value && fetchPromise) {
      await fetchPromise
      return
    }
    loading.value = true
    fetchPromise = (async () => {
      try {
        person.value = await ApiService.findOne<PersonItem>('current/person')
        loaded.value = true
      } catch {
        person.value = null
        loaded.value = false
      } finally {
        loading.value = false
        fetchPromise = null
      }
    })()
    await fetchPromise
  }

  /**
   * Starts an impersonation session as the given person and hard-reloads the
   * application. The reload guarantees that every Pinia store, cached SSE
   * connection, router guard and component-local state is rebuilt under the
   * target user's permissions.
   */
  async function startImpersonation(targetHandle: number): Promise<void> {
    await ApiService.post<unknown>(`auth/impersonate/${targetHandle}`)
    window.location.assign('/')
  }

  /**
   * Ends an active impersonation session and hard-reloads the application
   * back into the original administrator's context.
   */
  async function stopImpersonation(): Promise<void> {
    await ApiService.post<unknown>('auth/impersonate/stop')
    window.location.assign('/')
  }

  return {
    person,
    loading,
    loaded,
    impersonator,
    isImpersonating,
    isAdministrator,
    fetchCurrentPerson,
    startImpersonation,
    stopImpersonation,
  }
})
