import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import {
  getLatestOpenTaskSnapshot,
  useOpenTaskCountEvents,
  type OpenTaskSnapshot,
  type OpenTaskStreamItem,
} from '@/composables/system/useOpenTaskCountEvents'
import {
  isInSaplingNotificationQuietHours,
  loadSaplingNotificationPreferences,
  SAPLING_NOTIFICATION_PREFERENCES_UPDATED_EVENT,
  type SaplingNotificationPreferences,
} from '@/services/notification-preferences.service'

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
  const notificationPreferences = ref<SaplingNotificationPreferences>(
    loadSaplingNotificationPreferences(),
  )
  const currentPersonStore = useCurrentPersonStore()
  let incomingInboxPreviewSequence = 0
  //#endregion

  const inboxBadgeColor = computed(() => (inboxNotificationCount.value > 0 ? 'error' : 'primary'))

  useOpenTaskCountEvents((snapshot, context) => {
    applyNotificationPreferences(snapshot)

    if (!context || context.source !== 'stream' || context.newItems.length === 0) {
      return
    }

    if (
      !notificationPreferences.value.previewChannelEnabled ||
      isInSaplingNotificationQuietHours(notificationPreferences.value)
    ) {
      return
    }

    const newItems = context.newItems.filter((item) => isStreamItemEnabled(item))

    if (newItems.length === 0) {
      return
    }

    incomingInboxPreviewSequence += 1
    incomingInboxPreview.value = {
      ...newItems[0],
      sequence: incomingInboxPreviewSequence,
    }
  })

  //#region Lifecycle Hooks
  /**
   * Initializes the header state and starts the backend event stream.
   */
  onMounted(async () => {
    window.addEventListener(
      SAPLING_NOTIFICATION_PREFERENCES_UPDATED_EVENT,
      handleNotificationPreferencesUpdate,
    )
    await currentPersonStore.fetchCurrentPerson()
  })

  onUnmounted(() => {
    window.removeEventListener(
      SAPLING_NOTIFICATION_PREFERENCES_UPDATED_EVENT,
      handleNotificationPreferencesUpdate,
    )
  })
  //#endregion

  //#region Methods
  function handleNotificationPreferencesUpdate(event: Event) {
    const customEvent = event as CustomEvent<SaplingNotificationPreferences>
    notificationPreferences.value = customEvent.detail ?? loadSaplingNotificationPreferences()

    const latestSnapshot = getLatestOpenTaskSnapshot()
    if (latestSnapshot) {
      applyNotificationPreferences(latestSnapshot)
    }
  }

  function applyNotificationPreferences(snapshot: OpenTaskSnapshot) {
    const preferences = notificationPreferences.value
    const openTaskCount =
      snapshot.tickets.length +
      snapshot.tasks.length +
      snapshot.salesOpportunities.length +
      snapshot.effortEstimates.length
    const notificationCount = snapshot.notifications.length

    inboxCount.value = preferences.badgeChannelEnabled
      ? (preferences.openTaskNotificationsEnabled ? openTaskCount : 0) +
        (preferences.inboxNotificationsEnabled ? notificationCount : 0)
      : 0
    inboxNotificationCount.value =
      preferences.badgeChannelEnabled && preferences.inboxNotificationsEnabled
        ? notificationCount
        : 0
  }

  function isStreamItemEnabled(item: OpenTaskStreamItem) {
    if (item.kind === 'notification') {
      return notificationPreferences.value.inboxNotificationsEnabled
    }

    return notificationPreferences.value.openTaskNotificationsEnabled
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
