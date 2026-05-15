import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import {
  useOpenTaskCountEvents,
  type OpenTaskStreamItem,
} from '@/composables/system/useOpenTaskCountEvents'

export interface SaplingHeaderInboxPreview extends OpenTaskStreamItem {
  sequence: number
}

/**
 * Provides the state and interaction handlers for the shared application header.
 */
export function useSaplingHeader() {
  //#region State
  const router = useRouter()
  const showInbox = ref(false)
  const showAccount = ref(false)
  const inboxCount = ref(0)
  const inboxNotificationCount = ref(0)
  const incomingInboxPreview = ref<SaplingHeaderInboxPreview | null>(null)
  const currentPersonStore = useCurrentPersonStore()
  let incomingInboxPreviewSequence = 0
  //#endregion

  const inboxBadgeColor = computed(() => (inboxNotificationCount.value > 0 ? 'error' : 'primary'))

  useOpenTaskCountEvents((snapshot, context) => {
    inboxCount.value = snapshot.count
    inboxNotificationCount.value = snapshot.notifications.length

    if (!context || context.source !== 'stream' || context.newItems.length === 0) {
      return
    }

    incomingInboxPreviewSequence += 1
    incomingInboxPreview.value = {
      ...context.newItems[0],
      sequence: incomingInboxPreviewSequence,
    }
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
    inboxBadgeColor,
    incomingInboxPreview,
    currentPersonStore,
    openInbox,
    closeInbox,
    openAccount,
    closeAccount,
    goHome,
  }
  //#endregion
}
