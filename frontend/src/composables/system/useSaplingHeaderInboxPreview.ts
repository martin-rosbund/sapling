import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import type { SaplingHeaderInboxPreview } from '@/composables/system/useSaplingHeader'

export function useSaplingHeaderInboxPreview(
  incomingInboxPreview: Ref<SaplingHeaderInboxPreview | null>,
) {
  const visibleIncomingInboxPreview = ref<SaplingHeaderInboxPreview | null>(null)
  let incomingInboxPreviewTimeout: number | null = null
  let inboxPreviewAudioContext: AudioContext | null = null

  watch(
    () => incomingInboxPreview.value?.sequence,
    (sequence) => {
      if (!sequence || !incomingInboxPreview.value) {
        return
      }

      visibleIncomingInboxPreview.value = incomingInboxPreview.value

      if (incomingInboxPreviewTimeout != null) {
        window.clearTimeout(incomingInboxPreviewTimeout)
      }

      incomingInboxPreviewTimeout = window.setTimeout(() => {
        visibleIncomingInboxPreview.value = null
        incomingInboxPreviewTimeout = null
      }, 5000)

      void playInboxPing()
    },
  )

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

    if (inboxPreviewAudioContext) {
      void inboxPreviewAudioContext.close()
      inboxPreviewAudioContext = null
    }
  })

  return {
    visibleIncomingInboxPreview,
  }
}
