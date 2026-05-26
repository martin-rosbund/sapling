<template>
  <section class="sapling-min-size-0 sapling-chat-conversation sapling-ai-chat__conversation">
    <div class="sapling-chat-conversation__header sapling-ai-chat__conversation-header">
      <div class="sapling-chat-conversation__heading sapling-ai-chat__conversation-heading">
        <div
          class="sapling-row-xs sapling-chat-conversation__title-row sapling-ai-chat__conversation-title-row"
        >
          <div
            class="sapling-section-title sapling-chat-conversation__title sapling-ai-chat__conversation-title"
          >
            {{ getTruncatedTitle(activeConversationTitle) }}
          </div>
          <v-tooltip
            v-if="isTitleTruncated(activeConversationTitle)"
            location="top"
            max-width="400"
          >
            <template #activator="{ props: tooltipProps }">
              <v-icon
                v-bind="tooltipProps"
                icon="mdi-information-outline"
                class="sapling-chat-conversation__title-info sapling-ai-chat__title-info"
                size="small"
              />
            </template>

            <span>{{ activeConversationTitle }}</span>
          </v-tooltip>
        </div>
      </div>
      <div class="sapling-chat-runtime-selectors sapling-ai-chat__selectors">
        <v-alert
          v-if="!hasConfiguredProviders"
          class="sapling-chat-runtime-selectors__alert sapling-ai-chat__runtime-alert"
          density="comfortable"
          type="info"
          variant="tonal"
        >
          <div>{{ t('aiChat.noConfiguredProviders') }}</div>
          <div
            class="sapling-chat-runtime-selectors__alert-copy sapling-ai-chat__runtime-alert-copy"
          >
            {{ t('aiChat.contactAdministrator') }}
          </div>
        </v-alert>
        <v-select
          v-if="providerOptions.length > 0"
          :model-value="selectedProviderHandle"
          class="sapling-chat-runtime-selectors__select sapling-chat-runtime-selectors__select--provider sapling-ai-chat__provider-select"
          density="compact"
          :disabled="isSending || isLoadingProviders || isLoadingModels"
          hide-details
          item-title="label"
          item-value="value"
          :items="providerOptions"
          :label="t('aiChat.provider')"
          variant="outlined"
          @update:model-value="emit('update:selectedProvider', $event)"
        />
        <v-select
          v-if="modelOptions.length > 0"
          :model-value="selectedModelHandle"
          class="sapling-chat-runtime-selectors__select sapling-chat-runtime-selectors__select--model sapling-ai-chat__model-select"
          density="compact"
          :disabled="isSending || isLoadingModels || !selectedProviderHandle"
          hide-details
          item-title="label"
          item-value="value"
          :items="modelOptions"
          :label="t('aiChat.model')"
          variant="outlined"
          @update:model-value="emit('update:selectedModel', $event)"
        />
      </div>
    </div>

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
            {{ $t('aiChat.openDataLink') }}
          </v-btn>
        </div>
      </div>
    </div>

    <div class="sapling-stack-xl sapling-chat-composer sapling-ai-chat__composer">
      <v-textarea
        v-model="draftMessageModel"
        :disabled="!hasConfiguredProviders"
        :placeholder="
          hasConfiguredProviders ? t('aiChat.inputPlaceholder') : t('aiChat.noConfiguredProviders')
        "
        auto-grow
        density="comfortable"
        hide-details
        rows="3"
        variant="outlined"
        @keydown.enter.exact.prevent="emit('send')"
      />

      <div
        class="sapling-row-between-md sapling-chat-composer__actions sapling-ai-chat__composer-actions"
      >
        <div class="sapling-chat-composer__context sapling-ai-chat__composer-context flex-grow-1">
          <div
            class="sapling-stack-md sapling-chat-composer__select-stack sapling-ai-chat__voice-select-stack"
          >
            <div
              class="sapling-row-md sapling-row-wrap sapling-chat-composer__select-row sapling-ai-chat__voice-select-row"
            >
              <v-select
                v-if="transcriptionProviderOptions.length > 0"
                :model-value="selectedTranscriptionProviderHandle"
                class="sapling-chat-runtime-selectors__select sapling-chat-runtime-selectors__select--provider sapling-ai-chat__provider-select"
                density="compact"
                :disabled="
                  isSending || isLoadingTranscriptionProviders || isLoadingTranscriptionModels
                "
                hide-details
                item-title="label"
                item-value="value"
                :items="transcriptionProviderOptions"
                :label="t('aiChat.voiceProvider')"
                variant="outlined"
                @update:model-value="emit('update:selectedTranscriptionProvider', $event)"
              />
              <v-select
                v-if="transcriptionModelOptions.length > 0"
                :model-value="selectedTranscriptionModelHandle"
                class="sapling-chat-runtime-selectors__select sapling-chat-runtime-selectors__select--model sapling-ai-chat__model-select"
                density="compact"
                :disabled="
                  isSending || isLoadingTranscriptionModels || !selectedTranscriptionProviderHandle
                "
                hide-details
                item-title="label"
                item-value="value"
                :items="transcriptionModelOptions"
                :label="t('aiChat.voiceModel')"
                variant="outlined"
                @update:model-value="emit('update:selectedTranscriptionModel', $event)"
              />
            </div>
            <div
              v-if="
                hasConfiguredSpeechProviders ||
                speechProviderOptions.length > 0 ||
                speechModelOptions.length > 0
              "
              class="sapling-row-md sapling-row-wrap sapling-chat-composer__select-row sapling-ai-chat__voice-select-row"
            >
              <v-select
                v-if="speechProviderOptions.length > 0"
                :model-value="selectedSpeechProviderHandle"
                class="sapling-chat-runtime-selectors__select sapling-chat-runtime-selectors__select--provider sapling-ai-chat__provider-select"
                density="compact"
                :disabled="isSending || isLoadingSpeechProviders || isLoadingSpeechModels"
                hide-details
                item-title="label"
                item-value="value"
                :items="speechProviderOptions"
                :label="t('aiChat.voiceOutputProvider')"
                variant="outlined"
                @update:model-value="emit('update:selectedSpeechProvider', $event)"
              />
              <v-select
                v-if="speechModelOptions.length > 0"
                :model-value="selectedSpeechModelHandle"
                class="sapling-chat-runtime-selectors__select sapling-chat-runtime-selectors__select--model sapling-ai-chat__model-select"
                density="compact"
                :disabled="isSending || isLoadingSpeechModels || !selectedSpeechProviderHandle"
                hide-details
                item-title="label"
                item-value="value"
                :items="speechModelOptions"
                :label="t('aiChat.voiceOutputModel')"
                variant="outlined"
                @update:model-value="emit('update:selectedSpeechModel', $event)"
              />
            </div>
          </div>
        </div>
        <div class="d-flex ga-2">
          <v-btn
            variant="text"
            :disabled="
              !hasConfiguredProviders ||
              !hasConfiguredTranscriptionProviders ||
              isSending ||
              isTranscribingVoiceInput
            "
            :icon="isRecordingVoiceInput ? 'mdi-stop' : 'mdi-microphone-outline'"
            :loading="isTranscribingVoiceInput"
            :title="getVoiceInputButtonLabel()"
            @click="emit('toggle-voice-input')"
          />
          <v-btn
            variant="tonal"
            icon="mdi-send"
            :disabled="!canSendMessage || !draftMessage.trim()"
            :loading="isSending"
            :title="t('aiChat.send')"
            @click="emit('send')"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import SaplingMarkdownContent from '@/components/common/SaplingMarkdownContent.vue'
import type { AiChatMessageItem } from '@/entity/entity'

interface ChatNavigationLink {
  path: string
  entityHandle: string
  kind: 'list' | 'record' | 'route'
}

interface SelectOption {
  label: string
  value: string
}

const props = withDefaults(
  defineProps<{
    activeConversationTitle: string
    providerOptions: SelectOption[]
    modelOptions: SelectOption[]
    transcriptionProviderOptions: SelectOption[]
    transcriptionModelOptions: SelectOption[]
    speechProviderOptions: SelectOption[]
    speechModelOptions: SelectOption[]
    selectedProviderHandle: string | null
    selectedModelHandle: string | null
    selectedTranscriptionProviderHandle: string | null
    selectedTranscriptionModelHandle: string | null
    selectedSpeechProviderHandle: string | null
    selectedSpeechModelHandle: string | null
    hasConfiguredProviders: boolean
    hasConfiguredTranscriptionProviders: boolean
    hasConfiguredSpeechProviders: boolean
    canSendMessage: boolean
    isSending: boolean
    isLoadingProviders: boolean
    isLoadingModels: boolean
    isLoadingTranscriptionProviders: boolean
    isLoadingTranscriptionModels: boolean
    isLoadingSpeechProviders: boolean
    isLoadingSpeechModels: boolean
    messages: AiChatMessageItem[]
    draftMessage: string
    assistantName: string
    currentPersonDisplayName: string
    streamingDurationByHandle: Record<number, number>
    hasMoreMessages: boolean
    isLoadingOlderMessages: boolean
    isVoiceInputAvailable: boolean
    isVoiceOutputAvailable: boolean
    isRecordingVoiceInput: boolean
    isTranscribingVoiceInput: boolean
    speechStateByHandle: Record<number, string>
    titlePreviewLimit?: number
  }>(),
  {
    titlePreviewLimit: 30,
  },
)

const emit = defineEmits<{
  (event: 'update:selectedProvider', value: unknown): void
  (event: 'update:selectedModel', value: unknown): void
  (event: 'update:selectedTranscriptionProvider', value: unknown): void
  (event: 'update:selectedTranscriptionModel', value: unknown): void
  (event: 'update:selectedSpeechProvider', value: unknown): void
  (event: 'update:selectedSpeechModel', value: unknown): void
  (event: 'update:draftMessage', value: string): void
  (event: 'send'): void
  (event: 'close'): void
  (event: 'load-older-messages'): void
  (event: 'toggle-message-speech', message: AiChatMessageItem): void
  (event: 'toggle-voice-input'): void
}>()

const { t, te } = useI18n()
const router = useRouter()
const messageContainer = ref<HTMLElement | null>(null)
const autoOpenedNavigationKeys = new Set<string>()

const draftMessageModel = computed({
  get: () => props.draftMessage,
  set: (value: string) => emit('update:draftMessage', value),
})

function getLastItem<T>(items: readonly T[]): T | undefined {
  return items.length > 0 ? items[items.length - 1] : undefined
}

function getVoiceInputButtonLabel() {
  if (!props.isVoiceInputAvailable) {
    return t('aiChat.voiceInputUnavailable')
  }

  if (props.isTranscribingVoiceInput) {
    return t('aiChat.transcribingAudio')
  }

  if (props.isRecordingVoiceInput) {
    return t('aiChat.stopVoiceInput')
  }

  return t('aiChat.startVoiceInput')
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

function isTitleTruncated(value?: string | null) {
  return typeof value === 'string' && value.length > props.titlePreviewLimit
}

function getTruncatedTitle(value?: string | null) {
  if (!value) {
    return ''
  }

  if (!isTitleTruncated(value)) {
    return value
  }

  return `${value.slice(0, props.titlePreviewLimit)}...`
}

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
