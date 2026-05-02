import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import { buildApiUrl } from '@/services/api.client'

export const useAuthStore = defineStore('auth', () => {
  const authenticated = ref<boolean | null>(null)
  const loading = ref(false)
  let validationPromise: Promise<boolean> | null = null

  async function validate(force = false): Promise<boolean> {
    if (authenticated.value === true && !force) {
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
        return authenticated.value
      })
      .catch(() => {
        authenticated.value = false
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
  }

  function clear(): void {
    authenticated.value = false
  }

  return {
    authenticated,
    loading,
    validate,
    markAuthenticated,
    clear,
  }
})
