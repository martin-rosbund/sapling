import { computed, nextTick, ref } from 'vue'

export interface Message {
  id: number
  type: 'error' | 'info' | 'success' | 'warning'
  message: string
  description: string
  entity: string
  timestamp: Date
  hidden: boolean
}

const MAX_VISIBLE_MESSAGES = 3
const messages = ref<Message[]>([])
const hideTimers = new Map<number, ReturnType<typeof setTimeout>>()
let nextId = 1

const pulsingType = ref<Message['type'] | null>(null)
let pulseTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Shared message-center state and helpers used by footer actions and the dialog.
 */
export function useSaplingMessageCenter() {
  //#region State
  const dialog = ref(false)
  const visibleMessages = computed(() =>
    messages.value.filter((message) => !message.hidden).slice(0, MAX_VISIBLE_MESSAGES),
  )
  //#endregion

  //#region Methods
  /**
   * Inserts a new message and schedules it to fade from the floating stack.
   */
  function pushMessage(
    type: Message['type'],
    message: string,
    description: string,
    entity: string,
  ) {
    const messageItem: Message = {
      id: nextId++,
      type,
      message,
      description,
      entity,
      timestamp: new Date(),
      hidden: false,
    }

    messages.value.unshift(messageItem)
    hideTimers.set(
      messageItem.id,
      setTimeout(() => hideMessage(messageItem.id), 5000),
    )

    // Trigger pulse animation: reset first so re-triggering always restarts
    if (pulseTimer !== null) {
      clearTimeout(pulseTimer)
      pulseTimer = null
    }
    pulsingType.value = null
    nextTick(() => {
      pulsingType.value = type
      pulseTimer = setTimeout(() => {
        pulsingType.value = null
        pulseTimer = null
      }, 1400)
    })
  }

  /**
   * Hides a message from the floating list while keeping it in the history dialog.
   */
  function hideMessage(id: number) {
    const message = messages.value.find((entry) => entry.id === id)
    if (message) {
      message.hidden = true
    }

    clearHideTimer(id)
  }

  /**
   * Removes a single message permanently.
   */
  function removeMessage(id: number) {
    clearHideTimer(id)
    messages.value = messages.value.filter((message) => message.id !== id)
  }

  /**
   * Removes the complete message history.
   */
  function clearAll() {
    hideTimers.forEach((timer) => clearTimeout(timer))
    hideTimers.clear()
    messages.value = []
  }

  /**
   * Opens the message-center dialog.
   */
  function openDialog() {
    dialog.value = true
  }

  /**
   * Closes the message-center dialog.
   */
  function closeDialog() {
    dialog.value = false
  }

  /**
   * Resolves the icon used for the message type.
   */
  function getMessageIcon(type: Message['type']) {
    switch (type) {
      case 'error':
        return 'mdi-alert-circle'
      case 'success':
        return 'mdi-check-circle'
      case 'warning':
        return 'mdi-alert'
      default:
        return 'mdi-information'
    }
  }

  /**
   * Resolves the Vuetify color used for the message type.
   */
  function getMessageColor(type: Message['type']) {
    return type
  }

  function clearHideTimer(id: number) {
    const timer = hideTimers.get(id)
    if (!timer) {
      return
    }

    clearTimeout(timer)
    hideTimers.delete(id)
  }
  //#endregion

  //#region Return
  return {
    dialog,
    messages,
    visibleMessages,
    pulsingType,
    pushMessage,
    hideMessage,
    removeMessage,
    clearAll,
    openDialog,
    closeDialog,
    getMessageIcon,
    getMessageColor,
  }
  //#endregion
}
