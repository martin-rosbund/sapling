import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import { useOpenTaskCountEvents } from '@/composables/system/useOpenTaskCountEvents'

/**
 * Provides the state and interaction handlers for the shared application header.
 */
export function useSaplingHeader() {
  //#region State
  const router = useRouter()
  const showInbox = ref(false)
  const showAccount = ref(false)
  const inboxCount = ref(0)
  const currentPersonStore = useCurrentPersonStore()
  //#endregion

  useOpenTaskCountEvents((snapshot) => {
    inboxCount.value = snapshot.count
  })

  //#region Lifecycle Hooks
  /**
   * Initializes the header state and starts the backend event stream.
   */
  onMounted(async () => {
    await currentPersonStore.fetchCurrentPerson()
  })
  //#endregion

  //#region Methods

  /**
   * Opens the inbox dialog.
   */
  function openInbox() {
    showInbox.value = true
  }

  /**
   * Closes the inbox dialog.
   */
  function closeInbox() {
    showInbox.value = false
  }

  /**
   * Opens the account dialog.
   */
  function openAccount() {
    showAccount.value = true
  }

  /**
   * Closes the account dialog.
   */
  function closeAccount() {
    showAccount.value = false
  }

  /**
   * Navigates back to the home route.
   */
  async function goHome() {
    await router.push('/')
  }
  //#endregion

  //#region Return
  return {
    showInbox,
    showAccount,
    inboxCount,
    currentPersonStore,
    openInbox,
    closeInbox,
    openAccount,
    closeAccount,
    goHome,
  }
  //#endregion
}
