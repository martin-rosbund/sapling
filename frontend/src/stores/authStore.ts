import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import { buildApiUrl } from '@/services/api.client'

const AUTH_VALIDATION_TTL_MS = 2 * 60 * 1000

export const useAuthStore = defineStore('auth', () => {
  const authenticated = ref<boolean | null>(null)
  const loading = ref(false)
  const lastValidatedAt = ref<number | null>(null)
  let validationPromise: Promise<boolean> | null = null

  async function validate(force = false): Promise<boolean> {
    const now = Date.now()
    const hasFreshValidation =
      lastValidatedAt.value !== null && now - lastValidatedAt.value < AUTH_VALIDATION_TTL_MS

    if (authenticated.value === true && hasFreshValidation && !force) {
      return true
    }

    if (loading.value && validationPromise) {
      return validationPromise
    }

    loading.value = true
    validationPromise = axios
      .get<{ authenticated: boolean }>(buildApiUrl('auth/isAuthenticated'), {
        validateStatus: (status) => status === 200 || status === 401,
      })
      .then((response) => {
        authenticated.value = response.status === 200 && response.data.authenticated === true
        lastValidatedAt.value = Date.now()
        return authenticated.value
      })
      .catch(() => {
        authenticated.value = false
        lastValidatedAt.value = Date.now()
        return false
      })
      .finally(() => {
        loading.value = false
        validationPromise = null
      })

    return validationPromise
  }

  function markAuthenticated(): void {
    authenticated.value = true
    lastValidatedAt.value = Date.now()
  }

  function clear(): void {
    authenticated.value = false
    lastValidatedAt.value = null
  }

  return {
    authenticated,
    loading,
    lastValidatedAt,
    validate,
    markAuthenticated,
    clear,
  }
})
