import { i18n } from '@/i18n' // Import the internationalization instance
import { computed, onMounted, onUnmounted, ref, watch } from 'vue' // Import Vue helpers for reactive state and lifecycle hooks
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader' // Import a custom composable for loading translations
import axios, { AxiosError } from 'axios' // Import Axios for making HTTP requests
import { BACKEND_URL, DEBUG_PASSWORD, DEBUG_USERNAME } from '@/constants/project.constants' // Import constants for backend URL and debug credentials
import type { PersonItem } from '@/entity/entity' // Import the PersonItem type for type safety
import type { ApplicationState } from '@/entity/system'
import CookieService from '@/services/cookie.service'
import { resolvePostLoginPath } from '@/utils/authRouting'
import { useAuthStore } from '@/stores/authStore'

/**
 * Provides login state and actions for the local and external authentication flows.
 */
export function useSaplingLogin() {
  //#region State
  const BOOT_POLL_INTERVAL = 3000

  // Reactive properties for email and password, initialized with debug credentials
  const email = ref(CookieService.get('username') || DEBUG_USERNAME)
  const password = ref(DEBUG_PASSWORD)
  const rememberMe = ref(CookieService.get('rememberMe') === 'true')
  CookieService.delete('password')

  // Load translations for the login module
  const { isLoading: isTranslationLoading, loadTranslations } = useTranslationLoader('login', {
    autoLoad: false,
  })
  const isBooting = ref(true)
  const isLoading = computed(() => isTranslationLoading.value || isBooting.value)
  const isAuthenticating = ref(false)
  const loginErrorMessage = ref('')
  const authStore = useAuthStore()

  // Reactive properties for managing the password change dialog
  const showPasswordChange = ref(false)
  const requirePasswordChange = ref(false)

  // Reactive property for storing the logged-in user's data
  const personData = ref<PersonItem | null>(null)

  let bootPollingInterval: number | null = null

  watch(
    isBooting,
    (booting) => {
      if (!booting) {
        void loadTranslations().catch(() => undefined)
      }
    },
    { immediate: true },
  )

  watch(
    () => i18n.global.locale.value,
    () => {
      if (!isBooting.value) {
        void loadTranslations().catch(() => undefined)
      }
    },
  )
  //#endregion

  //#region Boot State
  async function checkSystemState() {
    try {
      const response = await axios.get<ApplicationState>(BACKEND_URL + 'system/state')
      isBooting.value = response.data.isReady !== true
    } catch {
      isBooting.value = true
    }
  }

  async function initializeBootState() {
    await checkSystemState()

    if (!isBooting.value) {
      return
    }

    bootPollingInterval = window.setInterval(async () => {
      await checkSystemState()

      if (!isBooting.value && bootPollingInterval) {
        clearInterval(bootPollingInterval)
        bootPollingInterval = null
      }
    }, BOOT_POLL_INTERVAL)
  }

  onMounted(async () => {
    await initializeBootState()
  })

  onUnmounted(() => {
    if (bootPollingInterval) {
      clearInterval(bootPollingInterval)
      bootPollingInterval = null
    }
  })
  //#endregion

  //#region Login
  // Function to handle the login process
  async function handleLogin() {
    isAuthenticating.value = true
    loginErrorMessage.value = ''

    try {
      // Send a POST request to the backend to log in
      await axios.post(BACKEND_URL + 'auth/local/login', {
        loginName: email.value,
        loginPassword: password.value,
        rememberMe: rememberMe.value,
      })
      authStore.markAuthenticated()

      // After login, fetch the current user's data
      const response = await axios.get(BACKEND_URL + 'current/person')
      personData.value = response.data

      // Set cookies if "remember me" is checked
      setRememberMe()

      // Check if the user is required to change their password
      if (personData.value?.requirePasswordChange) {
        requirePasswordChange.value = true
        showPasswordChange.value = true
        // Do not redirect, show the password change dialog
      } else {
        requirePasswordChange.value = false
        window.location.href = resolvePostLoginPath(personData.value)
      }
    } catch (ex: AxiosError | unknown) {
      loginErrorMessage.value = resolveLoginErrorMessage(ex)
    } finally {
      isAuthenticating.value = false
    }
  }

  // Function to handle successful password change
  function handlePasswordChangeSuccess() {
    showPasswordChange.value = false // Hide the password change dialog
    requirePasswordChange.value = false
    window.location.href = resolvePostLoginPath(personData.value)
  }

  // Function to handle successful password change
  function setRememberMe() {
    CookieService.delete('password')

    if (!rememberMe.value) {
      CookieService.delete('username') // Delete the username cookie
      CookieService.delete('rememberMe') // Delete the rememberMe cookie
      return
    }

    CookieService.set('username', email.value) // Save the username in a cookie
    CookieService.set('rememberMe', rememberMe.value.toString()) // Save the rememberMe state in a cookie
  }
  //#endregion

  //#region Azure
  // Function to handle Azure login
  function handleAzure() {
    window.location.href = BACKEND_URL + 'auth/azure/login' // Redirect to Azure login
  }
  //#endregion

  //#region Google
  // Function to handle Google login
  function handleGoogle() {
    window.location.href = BACKEND_URL + 'auth/google/login' // Redirect to Google login
  }
  //#endregion

  //#region Return
  // Return all reactive properties and methods for use in components
  return {
    email,
    password,
    rememberMe,
    isLoading,
    isAuthenticating,
    loginErrorMessage,
    handleLogin,
    handleAzure,
    handleGoogle,
    showPasswordChange,
    requirePasswordChange,
    handlePasswordChangeSuccess,
  }
  //#endregion
}

function resolveLoginErrorMessage(error: AxiosError | unknown) {
  const resolveMessage = (message: string) =>
    i18n.global.te(message) ? i18n.global.t(message) : message

  if (error instanceof AxiosError) {
    const status = error.response?.status

    switch (status) {
      case 401:
        return resolveMessage('login.wrongCredentials')
      case 429:
        return resolveMessage('global.tooManyRequests')
      default:
        if (typeof error.response?.data === 'string' && error.response.data.trim().length > 0) {
          return resolveMessage(error.response.data)
        }

        return resolveMessage('login.unknownError')
    }
  }

  return resolveMessage('login.unknownError')
}
