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
        v-if="getMessageImportAttachments(message).length > 0"
        class="sapling-chip-row sapling-ai-chat__attachment-chips"
      >
        <v-chip
          v-for="attachment in getMessageImportAttachments(message)"
          :key="`${message.handle ?? message.sequence}-${attachment.attachmentHandle}`"
          size="small"
          variant="tonal"
          prepend-icon="mdi-file-delimited-outline"
        >
          {{ formatImportAttachmentChip(attachment) }}
        </v-chip>
      </div>
      <div
        v-if="getMessageToolActions(message).length > 0"
        class="sapling-stack-sm sapling-ai-chat__tool-actions"
      >
        <div
          v-for="action in getMessageToolActions(message)"
          :key="action.handle ?? `${action.serverName}.${action.toolName}`"
          class="sapling-ai-chat__tool-action"
        >
          <div class="sapling-row-between-md sapling-ai-chat__tool-action-header">
            <div class="sapling-stack-xs">
              <strong>{{ t('aiChat.toolActionTitle') }}</strong>
              <span>{{ action.serverName }}.{{ action.toolName }}</span>
            </div>
            <v-chip size="small" variant="tonal">{{ getToolActionStatusLabel(action) }}</v-chip>
          </div>
          <pre class="sapling-ai-chat__tool-action-arguments">{{
            formatToolActionArguments(action)
          }}</pre>
          <v-alert
            v-if="getToolActionError(action)"
            class="sapling-ai-chat__tool-action-error"
            density="compact"
            type="error"
            variant="tonal"
          >
            {{ getToolActionError(action) }}
          </v-alert>
          <div
            v-if="action.status === 'pending'"
            class="sapling-row-xs sapling-ai-chat__tool-action-actions"
          >
            <v-btn
              size="small"
              color="primary"
              variant="tonal"
              prepend-icon="mdi-check"
              :disabled="isToolActionSubmitting(action)"
              :loading="isToolActionSubmitting(action)"
              @click="emit('confirm-tool-action', action)"
            >
              {{ t('aiChat.confirmToolAction') }}
            </v-btn>
            <v-btn
              size="small"
              variant="text"
              prepend-icon="mdi-close"
              :disabled="isToolActionSubmitting(action)"
              @click="emit('reject-tool-action', action)"
            >
              {{ t('aiChat.rejectToolAction') }}
            </v-btn>
          </div>
        </div>
      </div>
      <div
        v-if="getTransparencyChips(message).length > 0"
        class="sapling-chip-row sapling-ai-chat__transparency"
      >
        <v-chip
          v-for="chip in getTransparencyChips(message)"
          :key="chip"
          size="small"
          variant="tonal"
          prepend-icon="mdi-eye-outline"
        >
          {{ chip }}
        </v-chip>
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
import type { AiChatMessageItem, AiChatToolActionItem } from '@/entity/entity'

interface ChatNavigationLink {
  path: string
  entityHandle: string
  kind: 'list' | 'record' | 'route'
}

interface ChatImportAttachment {
  attachmentHandle: number | null
  filename: string
  importBatchHandle: number | null
  summary?: {
    rowCount?: number
    headers?: unknown[]
    status?: string
  } | null
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
  activeToolActionHandles: Record<number, boolean>
  speechStateByHandle: Record<number, string>
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'load-older-messages'): void
  (event: 'toggle-message-speech', message: AiChatMessageItem): void
  (event: 'confirm-tool-action', action: AiChatToolActionItem): void
  (event: 'reject-tool-action', action: AiChatToolActionItem): void
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

function getMessageToolActions(message: AiChatMessageItem): AiChatToolActionItem[] {
  const responsePayload =
    message.responsePayload && typeof message.responsePayload === 'object'
      ? (message.responsePayload as Record<string, unknown>)
      : null
  const pendingActions = responsePayload?.pendingToolActions

  return Array.isArray(pendingActions) ? pendingActions.filter(isToolAction) : []
}

function isToolActionSubmitting(action: AiChatToolActionItem) {
  return !!action.handle && !!props.activeToolActionHandles[action.handle]
}

function getMessageImportAttachments(message: AiChatMessageItem): ChatImportAttachment[] {
  const requestPayload =
    message.requestPayload && typeof message.requestPayload === 'object'
      ? (message.requestPayload as Record<string, unknown>)
      : null
  const contextPayload =
    message.contextPayload && typeof message.contextPayload === 'object'
      ? (message.contextPayload as Record<string, unknown>)
      : null
  const attachments = Array.isArray(requestPayload?.importAttachments)
    ? requestPayload?.importAttachments
    : Array.isArray(contextPayload?.importAttachments)
      ? contextPayload?.importAttachments
      : []

  return attachments.filter(isChatImportAttachment)
}

function isChatImportAttachment(value: unknown): value is ChatImportAttachment {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { filename?: unknown }).filename === 'string'
  )
}

function formatImportAttachmentChip(attachment: ChatImportAttachment) {
  const rowCount =
    typeof attachment.summary?.rowCount === 'number'
      ? t('aiChat.attachmentRows', { count: attachment.summary.rowCount })
      : null
  const headerCount = Array.isArray(attachment.summary?.headers)
    ? t('aiChat.attachmentHeaders', { count: attachment.summary.headers.length })
    : null

  return [attachment.filename, rowCount, headerCount].filter(Boolean).join(' · ')
}

function isToolAction(value: unknown): value is AiChatToolActionItem {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { serverName?: unknown }).serverName === 'string' &&
    typeof (value as { toolName?: unknown }).toolName === 'string' &&
    typeof (value as { status?: unknown }).status === 'string'
  )
}

function getToolActionStatusLabel(action: AiChatToolActionItem) {
  const key = `aiChat.toolActionStatus.${action.status}`
  return te(key) ? t(key) : action.status
}

function formatToolActionArguments(action: AiChatToolActionItem) {
  const args = action.arguments ?? {}
  const text = JSON.stringify(args, null, 2)
  return text.length > 800 ? `${text.slice(0, 797)}...` : text
}

function getToolActionError(action: AiChatToolActionItem) {
  const payload = action.errorPayload

  if (!payload || typeof payload !== 'object') {
    return null
  }

  const error = (payload as Record<string, unknown>).error
  const message = (payload as Record<string, unknown>).message
  const value = typeof error === 'string' && error.trim() ? error : message

  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  const key = value.trim()
  return te(key) ? t(key) : key
}

function getTransparencyChips(message: AiChatMessageItem): string[] {
  const payload =
    message.responsePayload && typeof message.responsePayload === 'object'
      ? (message.responsePayload as Record<string, unknown>)
      : null

  if (!payload || message.role !== 'assistant') {
    return []
  }

  const toolResults = Array.isArray(payload.toolResults) ? payload.toolResults : []
  const sources = Array.isArray(payload.sources)
    ? payload.sources
    : Array.isArray(payload.navigationLinks)
      ? payload.navigationLinks
      : []
  const agentVersion =
    payload.agentVersion && typeof payload.agentVersion === 'object'
      ? (payload.agentVersion as { version?: unknown })
      : null
  const playbook =
    payload.playbook && typeof payload.playbook === 'object'
      ? (payload.playbook as { title?: unknown })
      : null

  return [
    toolResults.length > 0 ? `${toolResults.length} ${t('aiChat.toolsUsed')}` : null,
    sources.length > 0 ? `${sources.length} ${t('aiChat.sourcesUsed')}` : null,
    getMessageImportAttachments(message).length > 0
      ? `${getMessageImportAttachments(message).length} ${t('aiChat.attachmentsUsed')}`
      : null,
    typeof agentVersion?.version === 'number' ? `v${agentVersion.version}` : null,
    typeof playbook?.title === 'string' ? playbook.title : null,
  ].filter((chip): chip is string => !!chip)
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
