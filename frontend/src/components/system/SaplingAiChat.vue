<template>
  <div class="sapling-ai-chat-shell">
    <div v-if="isOpen" class="sapling-ai-chat__backdrop" @click="closePanel"></div>

    <transition name="sapling-ai-chat-panel">
      <section v-if="isOpen" class="glass-panel sapling-ai-chat" @click.stop>
        <template v-if="!isTranslationLoading">
          <div class="sapling-ai-chat__header">
            <div>
              <div class="sapling-ai-chat__eyebrow">{{ t('aiChat.titleEyebrow') }}</div>
              <div class="sapling-ai-chat__title">{{ assistantName }}</div>
            </div>

            <div class="sapling-ai-chat__header-actions">
              <v-btn size="small" variant="text" prepend-icon="mdi-refresh" @click="reloadSessions">
                {{ t('aiChat.refresh') }}
              </v-btn>
              <v-btn size="small" color="primary" prepend-icon="mdi-plus" @click="startNewChat">
                {{ t('aiChat.newChat') }}
              </v-btn>
              <v-btn icon="mdi-close" variant="text" size="small" @click="closePanel" />
            </div>
          </div>

          <v-progress-linear v-if="isBusy" indeterminate color="primary" />

          <div class="sapling-ai-chat__layout">
            <aside class="sapling-ai-chat__sessions">
              <div class="sapling-ai-chat__sessions-header">
                <span>{{ t('aiChat.sessions') }}</span>
                <v-switch
                  v-model="includeArchived"
                  color="primary"
                  density="compact"
                  hide-details
                  inset
                  @update:model-value="reloadSessions"
                >
                  <template #label>
                    <span class="sapling-ai-chat__switch-label">
                      {{ t('aiChat.showArchived') }}
                    </span>
                  </template>
                </v-switch>
              </div>

              <div v-if="sessions.length === 0" class="sapling-ai-chat__empty-state">
                {{ t('aiChat.noSessions') }}
              </div>

              <div v-else class="sapling-ai-chat__session-list">
                <button
                  v-for="session in sessions"
                  :key="session.handle ?? session.title"
                  type="button"
                  class="sapling-ai-chat__session-item"
                  :class="{ 'sapling-ai-chat__session-item--active': session.handle === activeSession?.handle }"
                  @click="selectSession(session)"
                >
                  <div class="sapling-ai-chat__session-main">
                    <template v-if="editingSessionHandle === session.handle">
                      <v-text-field
                        v-model="editingSessionTitle"
                        density="compact"
                        hide-details
                        autofocus
                        @click.stop
                        @keyup.enter="saveSessionTitle(session)"
                      />
                    </template>
                    <template v-else>
                      <div class="sapling-ai-chat__session-title-row">
                        <div class="sapling-ai-chat__session-title">{{ getTruncatedTitle(session.title) }}</div>
                        <v-tooltip v-if="isTitleTruncated(session.title)" location="top" max-width="400">
                          <template #activator="{ props: tooltipProps }">
                            <v-icon
                              v-bind="tooltipProps"
                              icon="mdi-information-outline"
                              class="sapling-ai-chat__title-info"
                              size="small"
                              @click.stop
                            />
                          </template>

                          <span>{{ session.title }}</span>
                        </v-tooltip>
                      </div>
                      <div class="sapling-ai-chat__session-meta">
                        {{ formatSessionMeta(session) }}
                      </div>
                    </template>
                  </div>

                  <div class="sapling-ai-chat__session-actions">
                    <v-btn
                      v-if="editingSessionHandle === session.handle"
                      icon="mdi-check"
                      size="x-small"
                      variant="text"
                      @click.stop="saveSessionTitle(session)"
                    />
                    <v-btn
                      v-else
                      icon="mdi-pencil-outline"
                      size="x-small"
                      variant="text"
                      @click.stop="beginRename(session)"
                    />
                    <v-btn
                      icon="mdi-archive-outline"
                      size="x-small"
                      variant="text"
                      @click.stop="toggleArchive(session)"
                    />
                  </div>
                </button>
              </div>
            </aside>

            <section class="sapling-ai-chat__conversation">
              <div class="sapling-ai-chat__conversation-header">
                <div class="sapling-ai-chat__conversation-heading">
                  <div class="sapling-ai-chat__conversation-title-row">
                    <div class="sapling-ai-chat__conversation-title">
                      {{ getTruncatedTitle(activeConversationTitle) }}
                    </div>
                    <v-tooltip v-if="isTitleTruncated(activeConversationTitle)" location="top" max-width="400">
                      <template #activator="{ props: tooltipProps }">
                        <v-icon
                          v-bind="tooltipProps"
                          icon="mdi-information-outline"
                          class="sapling-ai-chat__title-info"
                          size="small"
                        />
                      </template>

                      <span>{{ activeConversationTitle }}</span>
                    </v-tooltip>
                  </div>
                </div>
                <div class="sapling-ai-chat__selectors">
                  <v-select
                    v-if="providerOptions.length > 0"
                    :model-value="selectedProviderHandle"
                    class="sapling-ai-chat__provider-select"
                    density="compact"
                    :disabled="isSending || isLoadingProviders || isLoadingModels"
                    hide-details
                    item-title="label"
                    item-value="value"
                    :items="providerOptions"
                    :label="t('aiChat.provider')"
                    variant="outlined"
                    @update:model-value="updateSelectedProvider"
                  />
                  <v-select
                    v-if="modelOptions.length > 0"
                    :model-value="selectedModelHandle"
                    class="sapling-ai-chat__model-select"
                    density="compact"
                    :disabled="isSending || isLoadingModels || !selectedProviderHandle"
                    hide-details
                    item-title="label"
                    item-value="value"
                    :items="modelOptions"
                    :label="t('aiChat.model')"
                    variant="outlined"
                    @update:model-value="updateSelectedModel"
                  />
                </div>
              </div>

              <div ref="messageContainer" class="sapling-ai-chat__messages">
                <div v-if="messages.length === 0" class="sapling-ai-chat__empty-state">
                  {{ t('aiChat.noMessages') }}
                </div>

                <div
                  v-for="message in messages"
                  :key="message.handle ?? `${message.sequence}-${message.role}`"
                  class="sapling-ai-chat__message"
                  :class="{
                    'sapling-ai-chat__message--user': message.role === 'user',
                    'sapling-ai-chat__message--assistant': message.role === 'assistant',
                  }"
                >
                  <div class="sapling-ai-chat__message-role">
                    {{ getMessageRoleLabel(message) }}
                    <span v-if="message.status === 'streaming'" class="sapling-ai-chat__message-status">
                      {{ getStreamingStatusLabel(message) }}
                    </span>
                  </div>
                  <div class="sapling-ai-chat__message-content">{{ getMessageDisplayContent(message) }}</div>
                </div>
              </div>

              <div class="sapling-ai-chat__composer">
                <v-textarea
                  v-model="draftMessage"
                  :placeholder="t('aiChat.inputPlaceholder')"
                  auto-grow
                  density="comfortable"
                  hide-details
                  rows="3"
                  variant="outlined"
                  @keydown.enter.exact.prevent="sendMessage"
                />

                <div class="sapling-ai-chat__composer-actions">
                  <div class="sapling-ai-chat__composer-context">
                    <v-chip
                      class="sapling-ai-chat__composer-badge"
                      color="primary"
                      prepend-icon="mdi-check-circle-outline"
                      size="small"
                      variant="tonal"
                    >
                      {{ t('aiChat.connectedBadge') }}
                    </v-chip>
                  </div>
                  <v-btn color="primary" :loading="isSending" @click="sendMessage">
                    {{ t('aiChat.send') }}
                  </v-btn>
                </div>
              </div>
            </section>
          </div>
        </template>
      </section>
    </transition>

  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type {
  AiChatMessageItem,
  AiChatSessionItem,
  AiProviderModelItem,
  AiProviderTypeItem,
} from '@/entity/entity'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import ApiAiService, { type AiChatStreamEvent } from '@/services/api.ai.service'
import { useSaplingAiChat } from '@/composables/system/useSaplingAiChat'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'

const route = useRoute()
const currentPersonStore = useCurrentPersonStore()
const messageCenter = useSaplingMessageCenter()
const { t } = useI18n()
const { isLoading: isTranslationLoading, loadTranslations } = useTranslationLoader('aiChat')
const assistantName = 'Songbird'
const TITLE_PREVIEW_LIMIT = 30

const { isOpen, closeSaplingAiChat } = useSaplingAiChat()
const includeArchived = ref(false)
const isLoadingProviders = ref(false)
const isLoadingModels = ref(false)
const isLoadingSessions = ref(false)
const isLoadingMessages = ref(false)
const isSending = ref(false)
const providerConfigs = ref<AiProviderTypeItem[]>([])
const modelConfigs = ref<AiProviderModelItem[]>([])
const sessions = ref<AiChatSessionItem[]>([])
const messages = ref<AiChatMessageItem[]>([])
const activeSession = ref<AiChatSessionItem | null>(null)
const selectedProviderHandle = ref<string | null>(null)
const selectedModelHandle = ref<string | null>(null)
const draftMessage = ref('')
const editingSessionHandle = ref<number | null>(null)
const editingSessionTitle = ref('')
const messageContainer = ref<HTMLElement | null>(null)
const streamAbortController = ref<AbortController | null>(null)
const streamingClock = ref(Date.now())
const streamingMessageStartedAt = new Map<number, number>()
let streamingClockTimer: number | null = null

const isBusy = computed(
  () => isLoadingProviders.value || isLoadingModels.value || isLoadingSessions.value || isLoadingMessages.value || isSending.value,
)

const selectedProviderConfig = computed(() =>
  providerConfigs.value.find((item) => item.handle === selectedProviderHandle.value) ?? null,
)

const selectedModelConfig = computed(() =>
  modelConfigs.value.find((item) => item.handle === selectedModelHandle.value) ?? null,
)

const currentPersonDisplayName = computed(() => {
  const person = currentPersonStore.person

  if (!person) {
    return 'User'
  }

  const fullName = [person.firstName, person.lastName]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' ')

  return fullName || person.loginName || 'User'
})

const providerOptions = computed(() =>
  providerConfigs.value.map((item) => ({
    label: item.title,
    value: item.handle ?? '',
  })),
)

const filteredModelConfigs = computed(() =>
  modelConfigs.value.filter((item) => getModelProviderHandle(item) === selectedProviderHandle.value),
)

const modelOptions = computed(() =>
  filteredModelConfigs.value.map((item) => ({
    label: `${item.title} (${item.providerModel})`,
    value: item.handle ?? '',
  })),
)

const conversationSubtitle = computed(() => {
  if (selectedModelConfig.value) {
    const providerTitle = getProviderTitle(selectedModelConfig.value.provider)
    return `${providerTitle} • ${selectedModelConfig.value.title} (${selectedModelConfig.value.providerModel})`
  }

  const provider = getProviderTitle(activeSession.value?.provider)
  const model = getModelTitle(activeSession.value?.model)

  if (provider || model) {
    return [provider, model].filter(Boolean).join(' / ')
  }

  return t('aiChat.localDraft')
})

const activeConversationTitle = computed(() => activeSession.value?.title || t('aiChat.draftConversation'))

watch(
  () => currentPersonStore.person?.handle,
  async (handle) => {
    if (!handle) {
      return
    }

    await reloadSessions()
  },
)

watch(
  () => `${activeSession.value?.handle ?? 'draft'}:${getProviderHandle(activeSession.value?.provider) ?? ''}:${getModelHandle(activeSession.value?.model) ?? ''}:${providerConfigs.value.map((item) => item.handle ?? '').join(',')}:${modelConfigs.value.map((item) => item.handle ?? '').join(',')}`,
  () => {
    syncSelectedRuntimeTarget()
  },
  { immediate: true },
)

watch(
  () => messages.value.map((message) => `${message.handle}:${message.content.length}:${message.status}`).join('|'),
  async () => {
    await nextTick()
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    }
  },
)

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  streamingClockTimer = window.setInterval(() => {
    streamingClock.value = Date.now()
  }, 1000)

  await Promise.all([
    currentPersonStore.fetchCurrentPerson(),
    loadTranslations(),
    loadProviders(),
    loadModels(),
  ])

  if (currentPersonStore.person?.handle) {
    await reloadSessions()
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  streamAbortController.value?.abort()
  if (streamingClockTimer != null) {
    window.clearInterval(streamingClockTimer)
  }
})

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closePanel()
  }
}

function closePanel() {
  closeSaplingAiChat()
}

async function loadProviders() {
  isLoadingProviders.value = true

  try {
    providerConfigs.value = await ApiAiService.listProviders()
    syncSelectedRuntimeTarget()
  } finally {
    isLoadingProviders.value = false
  }
}

async function loadModels() {
  isLoadingModels.value = true

  try {
    modelConfigs.value = await ApiAiService.listModels()
    syncSelectedRuntimeTarget()
  } finally {
    isLoadingModels.value = false
  }
}

async function reloadSessions() {
  isLoadingSessions.value = true

  try {
    sessions.value = await ApiAiService.listSessions(includeArchived.value)

    if (activeSession.value?.handle) {
      const matchedSession = sessions.value.find((session) => session.handle === activeSession.value?.handle)
      activeSession.value = matchedSession ?? null

      if (matchedSession) {
        await loadMessages(matchedSession.handle)
      } else {
        messages.value = []
      }
    }
  } finally {
    isLoadingSessions.value = false
  }
}

async function loadMessages(sessionHandle?: number | null) {
  if (!sessionHandle) {
    messages.value = []
    return
  }

  isLoadingMessages.value = true

  try {
    messages.value = await ApiAiService.listMessages(sessionHandle)
  } finally {
    isLoadingMessages.value = false
  }
}

async function selectSession(session: AiChatSessionItem) {
  activeSession.value = session
  editingSessionHandle.value = null
  isOpen.value = true
  await loadMessages(session.handle)
}

function startNewChat() {
  activeSession.value = null
  messages.value = []
  draftMessage.value = ''
  editingSessionHandle.value = null
  isOpen.value = true
  syncSelectedRuntimeTarget()
}

function beginRename(session: AiChatSessionItem) {
  editingSessionHandle.value = session.handle ?? null
  editingSessionTitle.value = session.title
}

async function saveSessionTitle(session: AiChatSessionItem) {
  const nextTitle = editingSessionTitle.value.trim()

  if (!session.handle || !nextTitle) {
    editingSessionHandle.value = null
    return
  }

  const updatedSession = await ApiAiService.updateSession(session.handle, { title: nextTitle })
  replaceSession(updatedSession)
  activeSession.value = activeSession.value?.handle === updatedSession.handle ? updatedSession : activeSession.value
  editingSessionHandle.value = null
}

async function toggleArchive(session: AiChatSessionItem) {
  if (!session.handle) {
    return
  }

  const updatedSession = await ApiAiService.updateSession(session.handle, {
    isArchived: !session.isArchived,
  })

  replaceSession(updatedSession)

  if (!includeArchived.value && updatedSession.isArchived) {
    sessions.value = sessions.value.filter((item) => item.handle !== updatedSession.handle)
    if (activeSession.value?.handle === updatedSession.handle) {
      startNewChat()
    }
    return
  }

  if (activeSession.value?.handle === updatedSession.handle) {
    activeSession.value = updatedSession
  }
}

async function sendMessage() {
  const content = draftMessage.value.trim()

  if (!content || isSending.value) {
    return
  }

  isSending.value = true
  isOpen.value = true
  streamAbortController.value?.abort()
  streamAbortController.value = new AbortController()
  draftMessage.value = ''

  try {
    await ApiAiService.streamMessage(
      {
        sessionHandle: activeSession.value?.handle ?? undefined,
        sessionTitle: activeSession.value?.title,
        content,
        routeName: route.name != null ? String(route.name) : undefined,
        url: window.location.href,
        pageTitle: document.title || undefined,
        providerHandle: selectedProviderHandle.value ?? undefined,
        modelHandle: selectedModelHandle.value ?? undefined,
        contextPayload: {
          params: route.params,
          query: route.query,
          fullPath: route.fullPath,
        },
      },
      handleStreamEvent,
      streamAbortController.value.signal,
    )
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      messageCenter.pushMessage('error', 'ai.chat.streamFailed', '', 'aiChat')
    }
  } finally {
    isSending.value = false
  }
}

async function updateSelectedProvider(value: unknown) {
  const nextProviderHandle = normalizeHandle(value)
  const previousProviderHandle = selectedProviderHandle.value
  const previousModelHandle = selectedModelHandle.value

  selectedProviderHandle.value = nextProviderHandle
  selectedModelHandle.value = getDefaultModelForProvider(nextProviderHandle, previousModelHandle)?.handle ?? null

  if (!activeSession.value?.handle) {
    return
  }

  try {
    await persistRuntimeTargetSelection()
  } catch (error) {
    selectedProviderHandle.value = previousProviderHandle
    selectedModelHandle.value = previousModelHandle
    throw error
  }
}

async function updateSelectedModel(value: unknown) {
  const nextHandle = normalizeHandle(value)
  const nextModel = modelConfigs.value.find((item) => item.handle === nextHandle) ?? null
  const nextProviderHandle = getModelProviderHandle(nextModel)
  const previousProviderHandle = selectedProviderHandle.value
  const previousHandle = selectedModelHandle.value

  selectedProviderHandle.value = nextProviderHandle
  selectedModelHandle.value = nextModel?.handle ?? null

  if (!nextModel || !activeSession.value?.handle) {
    return
  }

  try {
    await persistRuntimeTargetSelection()
  } catch (error) {
    selectedProviderHandle.value = previousProviderHandle
    selectedModelHandle.value = previousHandle
    throw error
  }
}

async function persistRuntimeTargetSelection() {
  if (!activeSession.value?.handle || !selectedProviderHandle.value || !selectedModelHandle.value) {
    return
  }

  const updatedSession = await ApiAiService.updateSession(activeSession.value.handle, {
    providerHandle: selectedProviderHandle.value,
    modelHandle: selectedModelHandle.value,
  })
  replaceSession(updatedSession)
  activeSession.value = updatedSession
}

function handleStreamEvent(event: AiChatStreamEvent) {
  switch (event.type) {
    case 'session.upsert':
      if (event.session) {
        replaceSession(event.session)
        activeSession.value = event.session
      }
      break
    case 'message.user':
    case 'message.assistant':
    case 'message.completed':
      if (event.message) {
        upsertMessage(event.message)
      }
      if (event.session) {
        replaceSession(event.session)
        activeSession.value = event.session
      }
      break
    case 'message.delta':
      if (event.handle != null) {
        appendMessageDelta(event.handle, event.delta ?? '')
      }
      break
    case 'error':
      messageCenter.pushMessage('error', String(event.messageText ?? event.type), '', 'aiChat')
      break
  }
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

function getMessageRoleLabel(message: AiChatMessageItem) {
  return message.role === 'assistant' ? assistantName : currentPersonDisplayName.value
}

function getMessageDisplayContent(message: AiChatMessageItem) {
  if (message.content?.trim()) {
    return message.content
  }

  if (message.status === 'streaming') {
    return '...'
  }

  return message.content
}

function getStreamingStatusLabel(message: AiChatMessageItem) {
  const seconds = getStreamingDurationSeconds(message)
  return `... ${seconds}s`
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

function isTitleTruncated(value?: string | null) {
  return typeof value === 'string' && value.length > TITLE_PREVIEW_LIMIT
}

function getTruncatedTitle(value?: string | null) {
  if (!value) {
    return ''
  }

  if (!isTitleTruncated(value)) {
    return value
  }

  return `${value.slice(0, TITLE_PREVIEW_LIMIT)}...`
}

function replaceSession(session: AiChatSessionItem) {
  const index = sessions.value.findIndex((item) => item.handle === session.handle)

  if (index >= 0) {
    sessions.value.splice(index, 1, session)
  } else {
    sessions.value.unshift(session)
  }

  sessions.value = [...sessions.value].sort((left, right) => {
    const leftDate = left.lastMessageAt || left.updatedAt || left.createdAt
    const rightDate = right.lastMessageAt || right.updatedAt || right.createdAt
    return new Date(rightDate ?? 0).getTime() - new Date(leftDate ?? 0).getTime()
  })
}

function normalizeHandle(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return null
}

function syncSelectedRuntimeTarget() {
  const sessionProviderHandle = getProviderHandle(activeSession.value?.provider)
  const sessionModelHandle = getModelHandle(activeSession.value?.model)

  if (sessionModelHandle) {
    const sessionModel = modelConfigs.value.find((item) => item.handle === sessionModelHandle) ?? null
    selectedProviderHandle.value = sessionProviderHandle ?? getModelProviderHandle(sessionModel)
    selectedModelHandle.value = sessionModelHandle
    return
  }

  if (sessionProviderHandle) {
    selectedProviderHandle.value = sessionProviderHandle
    selectedModelHandle.value = getDefaultModelForProvider(sessionProviderHandle, selectedModelHandle.value)?.handle ?? null
    return
  }

  const defaultModel = getGlobalDefaultModel()
  selectedProviderHandle.value = getModelProviderHandle(defaultModel)
  selectedModelHandle.value = defaultModel?.handle ?? null
}

function getGlobalDefaultModel() {
  return modelConfigs.value.find((item) => item.isDefault) ?? modelConfigs.value[0] ?? null
}

function getDefaultModelForProvider(
  providerHandle?: string | null,
  preferredModelHandle?: string | null,
) {
  if (!providerHandle) {
    return null
  }

  const filteredModels = modelConfigs.value.filter(
    (item) => getModelProviderHandle(item) === providerHandle,
  )

  if (preferredModelHandle) {
    const preferredModel = filteredModels.find((item) => item.handle === preferredModelHandle) ?? null
    if (preferredModel) {
      return preferredModel
    }
  }

  return filteredModels.find((item) => item.isDefault) ?? filteredModels[0] ?? null
}

function getProviderHandle(provider?: AiProviderTypeItem | string | null) {
  if (!provider) {
    return null
  }

  if (typeof provider === 'string') {
    return provider
  }

  return provider.handle ?? null
}

function getProviderTitle(provider?: AiProviderTypeItem | string | null) {
  if (!provider) {
    return null
  }

  if (typeof provider === 'string') {
    return provider
  }

  return provider.title
}

function getModelHandle(model?: AiProviderModelItem | string | null) {
  if (!model) {
    return null
  }

  if (typeof model === 'string') {
    return model
  }

  return model.handle ?? null
}

function getModelTitle(model?: AiProviderModelItem | string | null) {
  if (!model) {
    return null
  }

  if (typeof model === 'string') {
    return model
  }

  return model.title
}

function getModelProviderHandle(model?: AiProviderModelItem | string | null) {
  if (!model || typeof model === 'string') {
    return null
  }

  return getProviderHandle(model.provider)
}

function formatSessionMeta(session: AiChatSessionItem) {
  const date = session.lastMessageAt || session.updatedAt || session.createdAt

  if (!date) {
    return session.isArchived
      ? t('aiChat.archived')
      : t('aiChat.active')
  }

  const prefix = session.isArchived
    ? `${t('aiChat.archived')} • `
    : ''

  return `${prefix}${new Date(date).toLocaleString()}`
}
</script>

<style scoped>
.sapling-ai-chat-shell {
  z-index: 1250;
}

.sapling-ai-chat__backdrop {
  position: fixed;
  inset: 0;
  background: transparent;
}

.sapling-ai-chat {
  position: fixed;
  right: 24px;
  bottom: 96px;
  width: min(720px, calc(100vw - 24px));
  max-width: calc(100vw - 24px);
  height: min(78vh, 760px);
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: 28px;
  overflow: hidden;
  z-index: 1251;
}

.sapling-ai-chat-panel-enter-active,
.sapling-ai-chat-panel-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.sapling-ai-chat-panel-enter-from,
.sapling-ai-chat-panel-leave-to {
  opacity: 0;
  transform: translateY(18px) scale(0.98);
}

.sapling-ai-chat__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  gap: 16px;
}

.sapling-ai-chat__eyebrow {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  opacity: 0.72;
}

.sapling-ai-chat__title {
  font-size: 1.35rem;
  font-weight: 600;
}

.sapling-ai-chat__header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sapling-ai-chat__layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  min-height: 0;
  flex: 1 1 auto;
}

.sapling-ai-chat__sessions {
  border-right: 1px solid var(--sapling-surface-border);
  padding: 16px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sapling-ai-chat__sessions-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-weight: 600;
}

.sapling-ai-chat__switch-label {
  font-size: 0.8rem;
}

.sapling-ai-chat__session-list {
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sapling-ai-chat__session-item {
  width: 100%;
  border: 1px solid var(--sapling-surface-border);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  text-align: left;
  padding: 12px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.sapling-ai-chat__session-item--active {
  border-color: rgba(var(--v-theme-primary), 0.65);
  background: rgba(var(--v-theme-primary), 0.12);
}

.sapling-ai-chat__session-main {
  min-width: 0;
  flex: 1 1 auto;
}

.sapling-ai-chat__session-title-row,
.sapling-ai-chat__conversation-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.sapling-ai-chat__session-title {
  font-weight: 600;
  word-break: break-word;
  min-width: 0;
}

.sapling-ai-chat__session-meta {
  margin-top: 6px;
  font-size: 0.78rem;
  opacity: 0.72;
}

.sapling-ai-chat__session-actions {
  display: flex;
  align-items: center;
}

.sapling-ai-chat__conversation {
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.sapling-ai-chat__conversation-header {
  display: grid;
  align-items: start;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--sapling-surface-border);
}

.sapling-ai-chat__conversation-heading {
  min-width: 0;
  flex: 1 1 auto;
}

.sapling-ai-chat__selectors {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  gap: 10px;
  width: 100%;
  min-width: 0;
  justify-self: end;
}

.sapling-ai-chat__conversation-title {
  font-size: 1.05rem;
  font-weight: 600;
  min-width: 0;
}

.sapling-ai-chat__title-info {
  flex: 0 0 auto;
  color: rgba(255, 255, 255, 0.62);
}

.sapling-ai-chat__conversation-subtitle {
  margin-top: 4px;
  font-size: 0.82rem;
  opacity: 0.68;
}

.sapling-ai-chat__provider-select,
.sapling-ai-chat__model-select {
  width: 100%;
}

.sapling-ai-chat__messages {
  flex: 1 1 auto;
  overflow: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sapling-ai-chat__message {
  align-self: flex-start;
  max-width: 88%;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--sapling-surface-border);
}

.sapling-ai-chat__message--user {
  align-self: flex-end;
  background: rgba(var(--v-theme-primary), 0.15);
}

.sapling-ai-chat__message-role {
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  font-weight: 600;
  opacity: 0.72;
  margin-bottom: 6px;
}

.sapling-ai-chat__message-status {
  margin-left: 8px;
  font-size: 0.72rem;
}

.sapling-ai-chat__message-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.sapling-ai-chat__composer {
  border-top: 1px solid var(--sapling-surface-border);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sapling-ai-chat__composer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sapling-ai-chat__composer-context {
  min-width: 0;
  flex: 1 1 auto;
}

.sapling-ai-chat__composer-badge {
  max-width: 100%;
}

@media (min-width: 1280px) {
  .sapling-ai-chat {
    width: 50vw;
    max-width: 50vw;
  }
}

.sapling-ai-chat__empty-state {
  padding: 16px;
  border: 1px dashed var(--sapling-surface-border);
  border-radius: 16px;
  opacity: 0.72;
}

@media (max-width: 960px) {
  .sapling-ai-chat {
    right: 12px;
    left: 12px;
    bottom: 84px;
    width: auto;
    height: min(76vh, 720px);
  }

  .sapling-ai-chat__layout {
    grid-template-columns: 1fr;
  }

  .sapling-ai-chat__sessions {
    max-height: 220px;
    border-right: 0;
    border-bottom: 1px solid var(--sapling-surface-border);
  }

  .sapling-ai-chat__header {
    flex-direction: column;
    align-items: stretch;
  }

  .sapling-ai-chat__header-actions,
  .sapling-ai-chat__composer-actions,
  .sapling-ai-chat__conversation-header {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .sapling-ai-chat__selectors {
    grid-template-columns: 1fr;
    width: 100%;
    flex-basis: auto;
  }

  .sapling-ai-chat__model-select {
    width: 100%;
    flex-basis: auto;
  }
}
</style>