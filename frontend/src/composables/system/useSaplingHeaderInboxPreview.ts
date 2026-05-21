import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { SaplingHeaderInboxPreview } from '@/composables/system/useSaplingHeader'

export function useSaplingHeaderInboxPreview(
  incomingInboxPreview: Ref<SaplingHeaderInboxPreview | null>,
) {
  const router = useRouter()
  const { t } = useI18n()
  const visibleIncomingInboxPreview = ref<SaplingHeaderInboxPreview | null>(null)
  let incomingInboxPreviewTimeout: number | null = null
  let inboxPreviewAudioContext: AudioContext | null = null
  let activeBrowserNotification: Notification | null = null
  const notificationPermission = ref<NotificationPermission | 'unsupported'>('unsupported')

  watch(
    () => incomingInboxPreview.value?.sequence,
    async (sequence) => {
      if (!sequence || !incomingInboxPreview.value) {
        return
      }

      updateNotificationPermission()

      if (shouldUseBrowserNotifications()) {
        const wasBrowserNotificationShown = showBrowserNotification(incomingInboxPreview.value)

        if (wasBrowserNotificationShown) {
          return
        }
      }

      await showHeaderPreview(incomingInboxPreview.value)
    },
  )

  onMounted(() => {
    updateNotificationPermission()
    void ensureNotificationPermission()
  })

  async function showHeaderPreview(preview: SaplingHeaderInboxPreview) {
    visibleIncomingInboxPreview.value = preview

    if (incomingInboxPreviewTimeout != null) {
      window.clearTimeout(incomingInboxPreviewTimeout)
    }

    incomingInboxPreviewTimeout = window.setTimeout(() => {
      visibleIncomingInboxPreview.value = null
      incomingInboxPreviewTimeout = null
    }, 5000)

    await playInboxPing()
  }

  function shouldUseBrowserNotifications() {
    return (
      notificationPermission.value === 'granted' &&
      typeof window !== 'undefined' &&
      typeof Notification !== 'undefined'
    )
  }

  function updateNotificationPermission() {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      notificationPermission.value = 'unsupported'
      return
    }

    notificationPermission.value = Notification.permission
  }

  async function ensureNotificationPermission() {
    if (
      typeof window === 'undefined' ||
      typeof Notification === 'undefined' ||
      Notification.permission !== 'default'
    ) {
      return
    }

    try {
      notificationPermission.value = await Notification.requestPermission()
    } catch {
      updateNotificationPermission()
    }
  }

  function showBrowserNotification(preview: SaplingHeaderInboxPreview) {
    if (
      typeof window === 'undefined' ||
      typeof Notification === 'undefined' ||
      Notification.permission !== 'granted'
    ) {
      return false
    }

    activeBrowserNotification?.close()

    try {
      const notification = new Notification(
        preview.title.trim() || getInboxKindLabel(preview.kind),
        {
          body: buildBrowserNotificationBody(preview),
          tag: preview.id,
          icon: `${window.location.origin}/icons/icon-192x192.png`,
          badge: `${window.location.origin}/icons/icon-192x192.png`,
          data: {
            route: router.resolve(preview.route).href,
          },
        },
      )

      notification.onclick = () => {
        void openIncomingInboxPreview(preview)
      }

      notification.onerror = () => {
        if (activeBrowserNotification === notification) {
          activeBrowserNotification = null
        }

        void showHeaderPreview(preview)
      }

      notification.onclose = () => {
        if (activeBrowserNotification === notification) {
          activeBrowserNotification = null
        }
      }

      activeBrowserNotification = notification
      return true
    } catch {
      updateNotificationPermission()
      return false
    }
  }

  function buildBrowserNotificationBody(preview: SaplingHeaderInboxPreview) {
    const kindLabel = getInboxKindLabel(preview.kind)
    const bodyText = preview.bodyText.trim()

    if (!bodyText) {
      return kindLabel
    }

    return `${kindLabel}\n${bodyText}`
  }

  function getInboxKindLabel(kind: SaplingHeaderInboxPreview['kind']) {
    switch (kind) {
      case 'ticket':
        return t('navigation.ticket')
      case 'event':
        return t('navigation.event')
      case 'salesOpportunity':
        return t('navigation.salesOpportunity')
      case 'notification':
      default:
        return t('navigation.inboxNotification')
    }
  }

  async function playInboxPing() {
    if (typeof window === 'undefined') {
      return
    }

    const webkitWindow = window as Window & { webkitAudioContext?: typeof AudioContext }
    const audioContextConstructor = window.AudioContext ?? webkitWindow.webkitAudioContext

    if (!audioContextConstructor) {
      return
    }

    try {
      inboxPreviewAudioContext ??= new audioContextConstructor()

      if (inboxPreviewAudioContext.state === 'suspended') {
        await inboxPreviewAudioContext.resume()
      }

      const currentTime = inboxPreviewAudioContext.currentTime
      const oscillator = inboxPreviewAudioContext.createOscillator()
      const gainNode = inboxPreviewAudioContext.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(1046.5, currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(783.99, currentTime + 0.2)

      gainNode.gain.setValueAtTime(0.0001, currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.07, currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, currentTime + 0.24)

      oscillator.connect(gainNode)
      gainNode.connect(inboxPreviewAudioContext.destination)

      oscillator.start(currentTime)
      oscillator.stop(currentTime + 0.25)
      oscillator.onended = () => {
        oscillator.disconnect()
        gainNode.disconnect()
      }
    } catch {
      // Ignore blocked browser audio playback and keep the visual notification.
    }
  }

  async function openIncomingInboxPreview(preview: SaplingHeaderInboxPreview) {
    hideHeaderPreview()
    activeBrowserNotification?.close()
    activeBrowserNotification = null

    try {
      window.focus()
    } catch {
      // Ignore blocked focus calls and still attempt navigation.
    }

    await router.push(preview.route)
  }

  function hideHeaderPreview() {
    visibleIncomingInboxPreview.value = null

    if (incomingInboxPreviewTimeout != null) {
      window.clearTimeout(incomingInboxPreviewTimeout)
      incomingInboxPreviewTimeout = null
    }
  }

  onBeforeUnmount(() => {
    hideHeaderPreview()

    activeBrowserNotification?.close()
    activeBrowserNotification = null

    if (inboxPreviewAudioContext) {
      void inboxPreviewAudioContext.close()
      inboxPreviewAudioContext = null
    }
  })

  return {
    visibleIncomingInboxPreview,
    openIncomingInboxPreview,
  }
}
