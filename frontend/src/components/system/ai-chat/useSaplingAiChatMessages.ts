import { computed, ref } from 'vue'
import type { AiChatMessageItem } from '@/entity/entity'

type LocalFailedExchangeOptions = {
  content: string
  errorMessage: string
  personHandle: number
  sessionHandle: number
}

export function useSaplingAiChatMessages() {
  const messages = ref<AiChatMessageItem[]>([])
  const hasMoreMessages = ref(false)
  const nextMessageBeforeSequence = ref<number | null>(null)
  const streamingClock = ref(Date.now())
  const streamingMessageStartedAt = new Map<number, number>()
  let nextLocalMessageHandle = -1

  const streamingDurationByHandle = computed<Record<number, number>>(() => {
    const entries = messages.value
      .filter((message) => message.handle != null)
      .map((message) => [message.handle as number, getStreamingDurationSeconds(message)] as const)

    return Object.fromEntries(entries)
  })

  function resetMessageWindow() {
    hasMoreMessages.value = false
    nextMessageBeforeSequence.value = null
  }

  function mergeMessages(
    olderMessages: AiChatMessageItem[],
    existingMessages: AiChatMessageItem[],
  ) {
    const keyedMessages = new Map<string, AiChatMessageItem>()

    for (const message of [...olderMessages, ...existingMessages]) {
      const key =
        message.handle != null
          ? `handle:${message.handle}`
          : `sequence:${message.sequence}:${message.role}`
      keyedMessages.set(key, message)
    }

    return [...keyedMessages.values()].sort((left, right) => left.sequence - right.sequence)
  }

  function upsertMessage(message: AiChatMessageItem) {
    const index = messages.value.findIndex((item) => item.handle === message.handle)

    if (index >= 0) {
      messages.value.splice(index, 1, message)
    } else {
      messages.value.push(message)
    }

    trackStreamingMessage(message)
    messages.value = [...messages.value].sort((left, right) => left.sequence - right.sequence)
  }

  function appendMessageDelta(handle: number, delta: string) {
    const message = messages.value.find((item) => item.handle === handle)
    if (!message || !delta) {
      return
    }

    if (!streamingMessageStartedAt.has(handle)) {
      streamingMessageStartedAt.set(handle, Date.now())
    }

    message.content += delta
  }

  function appendLocalFailedExchange({
    content,
    errorMessage,
    personHandle,
    sessionHandle,
  }: LocalFailedExchangeOptions) {
    const trimmedContent = content.trim()

    if (!trimmedContent) {
      return
    }

    const lastMessage = messages.value.length > 0 ? messages.value[messages.value.length - 1] : null
    const nextSequence = (lastMessage?.sequence ?? 0) + 1
    const timestamp = new Date()

    upsertMessage({
      handle: nextLocalMessageHandle--,
      session: sessionHandle,
      person: personHandle,
      role: 'user',
      status: 'failed',
      sequence: nextSequence,
      content: trimmedContent,
      createdAt: timestamp,
      updatedAt: timestamp,
    } as AiChatMessageItem)

    upsertMessage({
      handle: nextLocalMessageHandle--,
      session: sessionHandle,
      person: personHandle,
      role: 'assistant',
      status: 'failed',
      sequence: nextSequence + 1,
      content: '',
      responsePayload: {
        error: errorMessage,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    } as AiChatMessageItem)
  }

  function trackStreamingMessage(message: AiChatMessageItem) {
    if (message.handle == null) {
      return
    }

    if (message.status === 'streaming') {
      if (!streamingMessageStartedAt.has(message.handle)) {
        streamingMessageStartedAt.set(message.handle, Date.now())
      }
      return
    }

    streamingMessageStartedAt.delete(message.handle)
  }

  function getStreamingDurationSeconds(message: AiChatMessageItem) {
    if (message.handle == null) {
      return 0
    }

    const startedAt = streamingMessageStartedAt.get(message.handle)

    if (!startedAt) {
      return 0
    }

    return Math.max(0, Math.floor((streamingClock.value - startedAt) / 1000))
  }

  return {
    messages,
    hasMoreMessages,
    nextMessageBeforeSequence,
    streamingClock,
    streamingDurationByHandle,
    resetMessageWindow,
    mergeMessages,
    upsertMessage,
    appendMessageDelta,
    appendLocalFailedExchange,
  }
}
