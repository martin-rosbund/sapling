import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Runs `task` on a fixed interval while the document is visible. When the tab
 * becomes hidden the interval is paused and an immediate refresh is scheduled
 * once visibility returns. This trims backend traffic and battery drain when
 * users leave the app in the background.
 */
export function useVisibilityAwarePolling(task: () => void | Promise<void>, intervalMs: number) {
  let intervalId: number | undefined

  function start() {
    if (intervalId !== undefined) {
      return
    }
    if (typeof window === 'undefined') {
      return
    }
    intervalId = window.setInterval(() => {
      void task()
    }, intervalMs)
  }

  function stop() {
    if (intervalId !== undefined) {
      clearInterval(intervalId)
      intervalId = undefined
    }
  }

  function onVisibilityChange() {
    if (typeof document === 'undefined') {
      return
    }
    if (document.visibilityState === 'visible') {
      void task()
      start()
    } else {
      stop()
    }
  }

  onMounted(() => {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange)
      if (document.visibilityState === 'visible') {
        start()
      }
    } else {
      start()
    }
  })

  onBeforeUnmount(() => {
    stop()
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  })
}
