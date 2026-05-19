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

      if (shouldUseBrowserNotifications()) {
        showBrowserNotification(incomingInboxPreview.value)
        return
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
    return notificationPermission.value === 'granted'
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
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return
    }

    activeBrowserNotification?.close()

    const notification = new Notification(preview.title, {
      body: buildBrowserNotificationBody(preview),
      tag: preview.id,
    })

    notification.onclick = () => {
      notification.close()
      activeBrowserNotification = null

      try {
        window.focus()
      } catch {
        // Ignore blocked focus calls and still attempt navigation.
      }

      void router.push(preview.route)
    }

    notification.onclose = () => {
      if (activeBrowserNotification === notification) {
        activeBrowserNotification = null
      }
    }

    activeBrowserNotification = notification
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

  onBeforeUnmount(() => {
    if (incomingInboxPreviewTimeout != null) {
      window.clearTimeout(incomingInboxPreviewTimeout)
    }

    activeBrowserNotification?.close()
    activeBrowserNotification = null

    if (inboxPreviewAudioContext) {
      void inboxPreviewAudioContext.close()
      inboxPreviewAudioContext = null
    }
  })

  return {
    visibleIncomingInboxPreview,
  }
}
