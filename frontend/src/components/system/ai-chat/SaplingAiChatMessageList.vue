<template>
  <div
    ref="messageContainer"
    class="sapling-scroll-list sapling-chat-message-list sapling-ai-chat__messages"
  >
    <div v-if="hasMoreMessages" class="sapling-ai-chat__history-loader">
      <v-btn
        size="small"
        variant="text"
        :loading="isLoadingOlderMessages"
        @click="emit('load-older-messages')"
      >
        {{ t('aiChat.loadOlderMessages') }}
      </v-btn>
    </div>

    <div
      v-if="messages.length === 0"
      class="sapling-empty-state-panel sapling-empty-state-panel--compact sapling-chat-empty-state sapling-ai-chat__empty-state"
    >
      {{ hasConfiguredProviders ? t('aiChat.noMessages') : t('aiChat.noConfiguredProviders') }}
    </div>

    <div
      v-for="message in messages"
      :key="message.handle ?? `${message.sequence}-${message.role}`"
      class="sapling-chat-message sapling-ai-chat__message"
      :class="{
        'sapling-ai-chat__message--user': message.role === 'user',
        'sapling-ai-chat__message--assistant': message.role === 'assistant',
        'sapling-ai-chat__message--failed': message.status === 'failed',
        'sapling-chat-message--user': message.role === 'user',
        'sapling-chat-message--failed': message.status === 'failed',
      }"
    >
      <div class="sapling-chat-message__role sapling-ai-chat__message-role">
        {{ getMessageRoleLabel(message) }}
        <span
          v-if="message.status === 'streaming' || message.status === 'failed'"
          class="sapling-chat-message__status sapling-ai-chat__message-status"
        >
          {{ getMessageStatusLabel(message) }}
        </span>
      </div>
      <div class="sapling-chat-message__content sapling-ai-chat__message-content">
        <SaplingMarkdownContent :source="getMessageDisplayContent(message)" />
      </div>
      <div
        v-if="shouldShowMessageActions(message)"
        class="sapling-chip-row sapling-chat-message__actions sapling-ai-chat__message-links"
      >
        <v-btn
          v-if="canPlayMessageSpeech(message)"
          size="small"
          variant="tonal"
          :loading="getMessageSpeechState(message) === 'loading'"
          :prepend-icon="getMessageSpeechButtonIcon(message)"
          @click="emit('toggle-message-speech', message)"
        >
          {{ getMessageSpeechButtonLabel(message) }}
        </v-btn>
        <v-btn
          v-for="link in getMessageNavigationLinks(message)"
          :key="`${message.handle ?? message.sequence}-${link.path}`"
          size="small"
          variant="tonal"
          prepend-icon="mdi-open-in-app"
          @click="openNavigationLink(link.path)"
        >
          {{ t('aiChat.openDataLink') }}
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import SaplingMarkdownContent from '@/components/common/SaplingMarkdownContent.vue'
import type { AiChatMessageItem } from '@/entity/entity'

interface ChatNavigationLink {
  path: string
  entityHandle: string
  kind: 'list' | 'record' | 'route'
}

const props = defineProps<{
  messages: AiChatMessageItem[]
  hasConfiguredProviders: boolean
  hasMoreMessages: boolean
  isLoadingOlderMessages: boolean
  isVoiceOutputAvailable: boolean
  assistantName: string
  currentPersonDisplayName: string
  streamingDurationByHandle: Record<number, number>
  speechStateByHandle: Record<number, string>
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'load-older-messages'): void
  (event: 'toggle-message-speech', message: AiChatMessageItem): void
}>()

const { t, te } = useI18n()
const router = useRouter()
const messageContainer = ref<HTMLElement | null>(null)
const autoOpenedNavigationKeys = new Set<string>()

function getLastItem<T>(items: readonly T[]): T | undefined {
  return items.length > 0 ? items[items.length - 1] : undefined
}

function shouldShowMessageActions(message: AiChatMessageItem) {
  return canPlayMessageSpeech(message) || getMessageNavigationLinks(message).length > 0
}

function canPlayMessageSpeech(message: AiChatMessageItem) {
  return (
    props.isVoiceOutputAvailable &&
    message.role === 'assistant' &&
    message.status === 'completed' &&
    message.handle != null &&
    !!message.content?.trim()
  )
}

function getMessageSpeechState(message: AiChatMessageItem) {
  if (message.handle == null) {
    return 'idle'
  }

  return props.speechStateByHandle[message.handle] ?? 'idle'
}

function getMessageSpeechButtonIcon(message: AiChatMessageItem) {
  return getMessageSpeechState(message) === 'playing' ? 'mdi-pause' : 'mdi-volume-high'
}

function getMessageSpeechButtonLabel(message: AiChatMessageItem) {
  const speechState = getMessageSpeechState(message)

  if (speechState === 'loading') {
    return t('aiChat.loadingVoiceOutput')
  }

  if (speechState === 'playing') {
    return t('aiChat.pauseVoiceOutput')
  }

  return t('aiChat.playVoiceOutput')
}

watch(
  () =>
    (() => {
      const lastMessage = getLastItem(props.messages)
      return lastMessage
        ? `${lastMessage.handle ?? 'pending'}:${lastMessage.content?.length ?? 0}:${lastMessage.status ?? ''}`
        : 'empty'
    })(),
  async () => {
    await nextTick()
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    }
  },
)

watch(
  () => {
    const lastMessage = getLastItem(props.messages)
    const link = lastMessage ? (getLastItem(getMessageNavigationLinks(lastMessage)) ?? null) : null

    return {
      handle: lastMessage?.handle ?? null,
      status: lastMessage?.status ?? null,
      role: lastMessage?.role ?? null,
      path: link?.path ?? null,
      kind: link?.kind ?? null,
    }
  },
  async ({ handle, status, role, path, kind }) => {
    if (role !== 'assistant' || status !== 'completed' || kind !== 'route' || !path) {
      return
    }

    const navigationKey = `${handle ?? 'pending'}:${path}`

    if (autoOpenedNavigationKeys.has(navigationKey)) {
      return
    }

    autoOpenedNavigationKeys.add(navigationKey)
    await openNavigationLink(path)
  },
)

function getMessageRoleLabel(message: AiChatMessageItem) {
  return message.role === 'assistant' ? props.assistantName : props.currentPersonDisplayName
}

function getMessageDisplayContent(message: AiChatMessageItem) {
  if (message.status === 'failed') {
    return getFailedMessageContent(message)
  }

  if (message.content?.trim()) {
    return message.content
  }

  if (message.status === 'streaming') {
    return '...'
  }

  return message.content ?? ''
}

function getMessageStatusLabel(message: AiChatMessageItem) {
  if (message.status === 'failed') {
    return t('aiChat.failed')
  }

  const seconds =
    message.handle == null ? 0 : (props.streamingDurationByHandle[message.handle] ?? 0)
  return `... ${seconds}s`
}

function getFailedMessageContent(message: AiChatMessageItem) {
  const detail = getFailedMessageDetail(message)

  if (!message.content?.trim()) {
    return detail ? `${t('aiChat.requestFailed')}\n\n${detail}` : t('aiChat.requestFailed')
  }

  return detail
    ? `${message.content}\n\n${t('aiChat.requestFailed')}\n\n${detail}`
    : `${message.content}\n\n${t('aiChat.requestFailed')}`
}

function getFailedMessageDetail(message: AiChatMessageItem) {
  const responsePayload =
    message.responsePayload && typeof message.responsePayload === 'object'
      ? (message.responsePayload as Record<string, unknown>)
      : null
  const rawError =
    responsePayload && typeof responsePayload.error === 'string' ? responsePayload.error : ''
  const errorLabel = rawError && te(rawError) ? t(rawError) : ''

  if (rawError === 'ai.providerNotConfigured') {
    return [errorLabel || t('aiChat.noConfiguredProviders'), t('aiChat.contactAdministrator')]
      .filter(Boolean)
      .join(' ')
  }

  return errorLabel
}

function getMessageNavigationLinks(message: AiChatMessageItem): ChatNavigationLink[] {
  const responsePayload =
    message.responsePayload && typeof message.responsePayload === 'object'
      ? (message.responsePayload as Record<string, unknown>)
      : null

  const navigationLinks = responsePayload?.navigationLinks

  if (!Array.isArray(navigationLinks)) {
    return []
  }

  const validNavigationLinks = navigationLinks.filter(isChatNavigationLink)
  const lastNavigationLink = getLastItem(validNavigationLinks)

  return lastNavigationLink ? [lastNavigationLink] : []
}

function isChatNavigationLink(value: unknown): value is ChatNavigationLink {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { path?: unknown }).path === 'string' &&
    typeof (value as { entityHandle?: unknown }).entityHandle === 'string' &&
    ((value as { kind?: unknown }).kind === 'list' ||
      (value as { kind?: unknown }).kind === 'record' ||
      (value as { kind?: unknown }).kind === 'route')
  )
}

async function openNavigationLink(path: string) {
  await router.push(path)
  emit('close')
}
</script>
