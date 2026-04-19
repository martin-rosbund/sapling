<template>
  <div class="sapling-ai-chat-shell">
    <div v-if="isOpen" class="sapling-ai-chat__backdrop" @click="closePanel"></div>

    <transition name="sapling-ai-chat-panel">
      <section v-if="isOpen" class="glass-panel sapling-ai-chat" @click.stop>
        <template v-if="!isTranslationLoading">
          <SaplingAiChatHeader
            :assistant-name="assistantName"
            :is-compact-header-actions="isCompactHeaderActions"
            @close="closePanel"
            @new-chat="startNewChat"
            @refresh="reloadSessions"
          />

          <div class="sapling-ai-chat__progress-slot">
            <v-progress-linear
              v-if="isBusy"
              indeterminate
              color="primary"
              class="sapling-ai-chat__progress"
            />
          </div>

          <div class="sapling-ai-chat__layout">
            <SaplingAiChatSessions
              :sessions="sessions"
              :active-session-handle="activeSession?.handle ?? null"
              :active-session-title="activeSession?.title ?? ''"
              :include-archived="includeArchived"
              :editing-session-handle="editingSessionHandle"
              :editing-session-title="editingSessionTitle"
              :is-collapsible="isMobileLayout"
              :is-collapsed="isSessionRailCollapsed"
              :title-preview-limit="TITLE_PREVIEW_LIMIT"
              @toggle-collapse="toggleSessionRail"
              @update:include-archived="updateIncludeArchived"
              @update:editing-session-title="updateEditingSessionTitle"
              @select="selectSession"
              @begin-rename="beginRename"
              @save-title="saveSessionTitle"
              @toggle-archive="toggleArchive"
            />

            <SaplingAiChatConversation
              :active-conversation-title="activeConversationTitle"
              :provider-options="providerOptions"
              :model-options="modelOptions"
              :selected-provider-handle="selectedProviderHandle"
              :selected-model-handle="selectedModelHandle"
              :is-sending="isSending"
              :is-loading-providers="isLoadingProviders"
              :is-loading-models="isLoadingModels"
              :messages="messages"
              :draft-message="draftMessage"
              :assistant-name="assistantName"
              :current-person-display-name="currentPersonDisplayName"
              :streaming-duration-by-handle="streamingDurationByHandle"
              :title-preview-limit="TITLE_PREVIEW_LIMIT"
              @update:selected-provider="updateSelectedProvider"
              @update:selected-model="updateSelectedModel"
              @update:draft-message="updateDraftMessage"
              @send="sendMessage"
            />
          </div>
        </template>
      </section>
    </transition>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import type {
  AiChatMessageItem,
  AiChatSessionItem,
  AiProviderModelItem,
  AiProviderTypeItem,
} from '@/entity/entity'
import SaplingAiChatConversation from '@/components/system/ai-chat/SaplingAiChatConversation.vue'
import SaplingAiChatHeader from '@/components/system/ai-chat/SaplingAiChatHeader.vue'
import SaplingAiChatSessions from '@/components/system/ai-chat/SaplingAiChatSessions.vue'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import ApiAiService, { type AiChatStreamEvent } from '@/services/api.ai.service'
import { useSaplingAiChat } from '@/composables/system/useSaplingAiChat'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'

const route = useRoute()
const currentPersonStore = useCurrentPersonStore()
const messageCenter = useSaplingMessageCenter()
const { t } = useI18n()
const { mdAndDown } = useDisplay()
const { isLoading: isTranslationLoading, loadTranslations } = useTranslationLoader('aiChat')
const assistantName = 'Songbird'
const TITLE_PREVIEW_LIMIT = 30
const isCompactHeaderActions = mdAndDown
const isMobileLayout = computed(() => mdAndDown.value)

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
const isSessionRailCollapsed = ref(false)
const streamAbortController = ref<AbortController | null>(null)
const streamingClock = ref(Date.now())
const streamingMessageStartedAt = new Map<number, number>()
let streamingClockTimer: number | null = null

const isBusy = computed(
  () => isLoadingProviders.value || isLoadingModels.value || isLoadingSessions.value || isLoadingMessages.value || isSending.value,
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

const streamingDurationByHandle = computed<Record<number, number>>(() => {
  const entries = messages.value
    .filter((message) => message.handle != null)
    .map((message) => [message.handle as number, getStreamingDurationSeconds(message)] as const)

  return Object.fromEntries(entries)
})

const activeConversationTitle = computed(() => activeSession.value?.title || t('aiChat.draftConversation'))

watch(
  isMobileLayout,
  (isMobile) => {
    isSessionRailCollapsed.value = isMobile
  },
  { immediate: true },
)

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

  if (isMobileLayout.value) {
    isSessionRailCollapsed.value = true
  }
}

function startNewChat() {
  activeSession.value = null
  messages.value = []
  draftMessage.value = ''
  editingSessionHandle.value = null
  isOpen.value = true
  syncSelectedRuntimeTarget()

  if (isMobileLayout.value) {
    isSessionRailCollapsed.value = true
  }
}

function toggleSessionRail() {
  if (!isMobileLayout.value) {
    return
  }

  isSessionRailCollapsed.value = !isSessionRailCollapsed.value
}

async function updateIncludeArchived(value: boolean) {
  includeArchived.value = value
  await reloadSessions()
}

function updateEditingSessionTitle(value: string) {
  editingSessionTitle.value = value
}

function updateDraftMessage(value: string) {
  draftMessage.value = value
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

function getModelHandle(model?: AiProviderModelItem | string | null) {
  if (!model) {
    return null
  }

  if (typeof model === 'string') {
    return model
  }

  return model.handle ?? null
}

function getModelProviderHandle(model?: AiProviderModelItem | string | null) {
  if (!model || typeof model === 'string') {
    return null
  }

  return getProviderHandle(model.provider)
}
</script>

<style src="@/assets/styles/SaplingAiChat.css"></style>