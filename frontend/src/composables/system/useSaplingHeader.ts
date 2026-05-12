import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ApiService from '@/services/api.service'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import { useVisibilityAwarePolling } from '@/composables/system/useVisibilityAwarePolling'

const INBOX_CHANGED_EVENT = 'sapling-inbox-changed'

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

  //#region Lifecycle Hooks
  /**
   * Initializes the header state and starts the refresh timer.
   */
  onMounted(async () => {
    await Promise.all([currentPersonStore.fetchCurrentPerson(), countInboxItems()])

    if (typeof window !== 'undefined') {
      window.addEventListener(INBOX_CHANGED_EVENT, countInboxItems)
    }
  })

  // Refresh the inbox badge once per minute while the tab is visible.
  useVisibilityAwarePolling(countInboxItems, 60000)

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(INBOX_CHANGED_EVENT, countInboxItems)
    }
  })
  //#endregion

  //#region Methods
  /**
   * Fetches the current number of open inbox items.
   */
  async function countInboxItems() {
    const result = await ApiService.findOne<{ count: number }>('current/countOpenTasks')
    inboxCount.value = result.count
  }

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
    countInboxItems,
  }
  //#endregion
}
