<template>
  <Teleport to="body">
    <div class="sapling-overlay-shell">
      <v-btn
        v-if="hasSaplingAiChatAccess && !isOpen"
        class="sapling-ai-chat-fab"
        color="primary"
        :icon="true"
        size="large"
        variant="elevated"
        aria-label="Songbird"
        title="Songbird"
        @click="toggleSaplingAiChat"
      >
        <SaplingSongbirdIcon class="sapling-ai-chat-fab__icon" />
      </v-btn>

      <div
        v-if="isOpen && hasSaplingAiChatAccess"
        class="sapling-overlay-backdrop"
        @click="closePanel"
      ></div>

      <transition name="sapling-floating-panel">
        <SaplingSurface
          as="section"
          v-if="isOpen && hasSaplingAiChatAccess"
          class="sapling-floating-panel sapling-floating-panel--top-center sapling-floating-panel--mobile-sheet sapling-ai-chat"
          @click.stop
        >
          <SaplingAiChatLoadingState v-if="isTranslationLoading" />

          <template v-else>
            <SaplingAiChatHeader
              :assistant-name="assistantName"
              :is-compact-header-actions="isCompactHeaderActions"
              @close="closePanel"
              @new-chat="startNewChat"
              @open-account-settings="openAccountSettings"
              @refresh="reloadSessions"
            />

            <div class="sapling-floating-panel__progress-slot sapling-ai-chat__progress-slot">
              <v-progress-linear
                v-if="isBusy"
                indeterminate
                color="primary"
                class="sapling-floating-panel__progress sapling-ai-chat__progress"
              />
            </div>

            <div class="sapling-chat-layout sapling-ai-chat__layout">
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
                :agent-options="agentOptions"
                :selected-agent-handle="selectedAgentHandle"
                :is-agent-locked="!!activeSession?.handle"
                :has-configured-providers="hasConfiguredProviders"
                :has-configured-transcription-providers="hasConfiguredTranscriptionProviders"
                :can-send-message="canSendMessage"
                :is-sending="isSending"
                :messages="messages"
                :draft-message="draftMessage"
                :assistant-name="assistantName"
                :current-person-display-name="currentPersonDisplayName"
                :streaming-duration-by-handle="streamingDurationByHandle"
                :has-more-messages="hasMoreMessages"
                :is-loading-older-messages="isLoadingOlderMessages"
                :is-voice-input-available="isVoiceInputAvailable"
                :is-voice-output-available="isVoiceOutputAvailable"
                :is-recording-voice-input="isRecordingVoiceInput"
                :is-transcribing-voice-input="isTranscribingVoiceInput"
                :speech-state-by-handle="speechStateByHandle"
                :title-preview-limit="TITLE_PREVIEW_LIMIT"
                @update:draft-message="updateDraftMessage"
                @update:selected-agent="updateSelectedAgent"
                @close="closePanel"
                @load-older-messages="loadOlderMessages"
                @toggle-message-speech="toggleMessageSpeech"
                @confirm-tool-action="confirmToolAction"
                @reject-tool-action="rejectToolAction"
                @toggle-voice-input="toggleVoiceInput"
                @send="sendMessage"
              />
            </div>
          </template>
        </SaplingSurface>
      </transition>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import type {
  AiAgentItem,
  AiChatSessionItem,
  AiChatToolActionItem,
  AiProviderModelItem,
  AiProviderTypeItem,
} from '@/entity/entity'
import SaplingSurface from '@/components/common/SaplingSurface.vue'
import SaplingSongbirdIcon from '@/components/common/SaplingSongbirdIcon.vue'
import SaplingAiChatConversation from '@/components/system/ai-chat/SaplingAiChatConversation.vue'
import SaplingAiChatHeader from '@/components/system/ai-chat/SaplingAiChatHeader.vue'
import SaplingAiChatLoadingState from '@/components/system/ai-chat/SaplingAiChatLoadingState.vue'
import SaplingAiChatSessions from '@/components/system/ai-chat/SaplingAiChatSessions.vue'
import {
  getModelHandle,
  getProviderHandle,
  resolveRuntimeTarget,
} from '@/components/system/ai-chat/aiChatRuntimeTargets'
import { useSaplingAiChatMessages } from '@/components/system/ai-chat/useSaplingAiChatMessages'
import { useSaplingAiChatSpeechPlayback } from '@/components/system/ai-chat/useSaplingAiChatSpeechPlayback'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import ApiAiService, { type AiChatStreamEvent } from '@/services/api.ai.service'
import { useSaplingAiChat } from '@/composables/system/useSaplingAiChat'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'
import { SAPLING_AI_CHAT_PROMPT_EVENT } from '@/utils/saplingScriptResultUtil'
import {
  SAPLING_AI_PREFERENCES_UPDATED_EVENT,
  loadSaplingAiPreferences,
  type SaplingAiPreferences,
} from '@/services/ai-preferences.service'
import { openSaplingAccountDialog } from '@/services/account-dialog.service'

interface SaplingAiChatPromptEventDetail {
  prompt?: string
  autoSend?: boolean
  newChat?: boolean
  title?: string
}

const route = useRoute()
const currentPersonStore = useCurrentPersonStore()
const messageCenter = useSaplingMessageCenter()
const storedAiPreferences = loadSaplingAiPreferences()
const { t } = useI18n()
const { mdAndDown } = useDisplay()
const { isLoading: isTranslationLoading, loadTranslations } = useTranslationLoader('aiChat', 'ai')
const assistantName = 'Songbird'
const TITLE_PREVIEW_LIMIT = 30
const MESSAGE_PAGE_SIZE = 100
const VOICE_INPUT_SILENCE_THRESHOLD = 0.02
const VOICE_INPUT_SILENCE_STOP_DELAY_MS = 1600
const VOICE_INPUT_SILENCE_MONITOR_INTERVAL_MS = 200
const VOICE_INPUT_INITIAL_GRACE_PERIOD_MS = 2500
const isCompactHeaderActions = mdAndDown
const isMobileLayout = computed(() => mdAndDown.value)

const {
  isOpen,
  hasSaplingAiChatAccess,
  ensureSaplingAiChatAccess,
  closeSaplingAiChat,
  toggleSaplingAiChat,
} = useSaplingAiChat()
const includeArchived = ref(false)
const isLoadingProviders = ref(false)
const isLoadingModels = ref(false)
const isLoadingAgents = ref(false)
const isLoadingTranscriptionProviders = ref(false)
const isLoadingTranscriptionModels = ref(false)
const isLoadingSpeechProviders = ref(false)
const isLoadingSpeechModels = ref(false)
const isLoadingSessions = ref(false)
const isLoadingMessages = ref(false)
const isSending = ref(false)
const providerConfigs = ref<AiProviderTypeItem[]>([])
const modelConfigs = ref<AiProviderModelItem[]>([])
const agentConfigs = ref<AiAgentItem[]>([])
const transcriptionProviderConfigs = ref<AiProviderTypeItem[]>([])
const transcriptionModelConfigs = ref<AiProviderModelItem[]>([])
const speechProviderConfigs = ref<AiProviderTypeItem[]>([])
const speechModelConfigs = ref<AiProviderModelItem[]>([])
const sessions = ref<AiChatSessionItem[]>([])
const activeSession = ref<AiChatSessionItem | null>(null)
const selectedProviderHandle = ref<string | null>(storedAiPreferences.chatProviderHandle)
const selectedModelHandle = ref<string | null>(storedAiPreferences.chatModelHandle)
const selectedAgentHandle = ref<string | null>(null)
const selectedTranscriptionProviderHandle = ref<string | null>(
  storedAiPreferences.transcriptionProviderHandle,
)
const selectedTranscriptionModelHandle = ref<string | null>(
  storedAiPreferences.transcriptionModelHandle,
)
const selectedSpeechProviderHandle = ref<string | null>(storedAiPreferences.speechProviderHandle)
const selectedSpeechModelHandle = ref<string | null>(storedAiPreferences.speechModelHandle)
const draftMessage = ref('')
const editingSessionHandle = ref<number | null>(null)
const editingSessionTitle = ref('')
const isSessionRailCollapsed = ref(false)
const isLoadingOlderMessages = ref(false)
const isRecordingVoiceInput = ref(false)
const isTranscribingVoiceInput = ref(false)
const streamAbortController = ref<AbortController | null>(null)
const hasInitialized = ref(false)
const activeTranscriptionHandle = ref<number | null>(null)
const activeVoiceRecorder = ref<MediaRecorder | null>(null)
const activeVoiceStream = ref<MediaStream | null>(null)
const activeVoiceAudioContext = ref<AudioContext | null>(null)
const activeVoiceAnalyser = ref<AnalyserNode | null>(null)
const activeVoiceSourceNode = ref<MediaStreamAudioSourceNode | null>(null)
const activeSendAttempt = ref<{
  content: string
  receivedServerEvents: boolean
  shouldAutoPlaySpeech: boolean
} | null>(null)
let initializationPromise: Promise<void> | null = null
let streamingClockTimer: number | null = null
let voiceRecordingStartedAt: number | null = null
let pendingVoiceChunks: Blob[] = []
let discardPendingVoiceRecording = false
let voiceInputSilenceMonitorTimer: number | null = null
let lastDetectedVoiceActivityAt: number | null = null
const {
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
} = useSaplingAiChatMessages()
const isBusy = computed(
  () =>
    isLoadingProviders.value ||
    isLoadingModels.value ||
    isLoadingAgents.value ||
    isLoadingSessions.value ||
    isLoadingMessages.value ||
    isSending.value,
)

const currentPersonDisplayName = computed(() => {
  const person = currentPersonStore.person

  if (!person) {
    return t('aiChat.user')
  }

  const fullName = [person.firstName, person.lastName]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' ')

  return fullName || person.loginName || t('aiChat.user')
})

const hasConfiguredProviders = computed(
  () => providerConfigs.value.length > 0 && modelConfigs.value.length > 0,
)

const hasConfiguredTranscriptionProviders = computed(
  () => transcriptionProviderConfigs.value.length > 0 && transcriptionModelConfigs.value.length > 0,
)

const hasConfiguredSpeechProviders = computed(
  () => speechProviderConfigs.value.length > 0 && speechModelConfigs.value.length > 0,
)

const canSendMessage = computed(
  () =>
    hasConfiguredProviders.value && !!selectedProviderHandle.value && !!selectedModelHandle.value,
)

const isVoiceInputAvailable = computed(
  () =>
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    hasConfiguredTranscriptionProviders.value,
)

const isVoiceOutputAvailable = computed(
  () => typeof Audio !== 'undefined' && hasConfiguredSpeechProviders.value,
)

const activeConversationTitle = computed(
  () => activeSession.value?.title || t('aiChat.draftConversation'),
)

const agentOptions = computed(() =>
  agentConfigs.value.map((agent) => ({
    label: agent.title,
    value: agent.handle,
  })),
)

const {
  speechStateByHandle,
  autoPlayAssistantSpeech,
  toggleMessageSpeech,
  stopSpeechPlayback,
  revokeSpeechObjectUrls,
} = useSaplingAiChatSpeechPlayback({
  isOpen,
  isVoiceOutputAvailable,
  activeSession,
  messages,
  selectedSpeechProviderHandle,
  selectedSpeechModelHandle,
  speechModelConfigs,
  upsertMessage,
  reportPlaybackError: () => {
    messageCenter.pushMessage('error', 'ai.speech.playbackFailed', '', 'aiChat')
  },
})

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
    if (!handle || !hasInitialized.value) {
      return
    }

    await reloadSessions()
  },
)

watch(
  () => isOpen.value,
  async (nextIsOpen) => {
    if (!nextIsOpen) {
      return
    }

    if (!(await ensureSaplingAiChatAccess())) {
      closePanel()
      return
    }

    try {
      await ensureChatInitialized()
    } catch {
      // Errors are surfaced by the underlying services; keep retrying on the next open.
    }
  },
)

watch(hasSaplingAiChatAccess, (hasAccess) => {
  if (!hasAccess && isOpen.value) {
    closePanel()
  }
})

watch(
  () =>
    `${activeSession.value?.handle ?? 'draft'}:${getProviderHandle(activeSession.value?.provider) ?? ''}:${getModelHandle(activeSession.value?.model) ?? ''}:${providerConfigs.value.map((item) => item.handle ?? '').join(',')}:${modelConfigs.value.map((item) => item.handle ?? '').join(',')}`,
  () => {
    syncSelectedRuntimeTarget()
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener(SAPLING_AI_CHAT_PROMPT_EVENT, handleAiChatPromptEvent as EventListener)
  window.addEventListener(
    SAPLING_AI_PREFERENCES_UPDATED_EVENT,
    handleAiPreferencesUpdated as EventListener,
  )
  streamingClockTimer = window.setInterval(() => {
    streamingClock.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener(SAPLING_AI_CHAT_PROMPT_EVENT, handleAiChatPromptEvent as EventListener)
  window.removeEventListener(
    SAPLING_AI_PREFERENCES_UPDATED_EVENT,
    handleAiPreferencesUpdated as EventListener,
  )
  streamAbortController.value?.abort()
  cancelVoiceInput()
  stopSpeechPlayback()
  revokeSpeechObjectUrls()
  if (streamingClockTimer != null) {
    window.clearInterval(streamingClockTimer)
  }
})

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closePanel()
  }
}

function handleAiChatPromptEvent(event: CustomEvent<SaplingAiChatPromptEventDetail>) {
  void openPromptFromScriptButton(event.detail)
}

function handleAiPreferencesUpdated(event: CustomEvent<SaplingAiPreferences>) {
  const preferences = event.detail

  selectedProviderHandle.value = preferences.chatProviderHandle
  selectedModelHandle.value = preferences.chatModelHandle
  selectedTranscriptionProviderHandle.value = preferences.transcriptionProviderHandle
  selectedTranscriptionModelHandle.value = preferences.transcriptionModelHandle
  selectedSpeechProviderHandle.value = preferences.speechProviderHandle
  selectedSpeechModelHandle.value = preferences.speechModelHandle

  syncSelectedRuntimeTarget()
  syncSelectedTranscriptionTarget()
  syncSelectedSpeechTarget()
}

async function openPromptFromScriptButton(detail?: SaplingAiChatPromptEventDetail) {
  const prompt = detail?.prompt?.trim()

  if (!prompt) {
    return
  }

  if (!(await ensureSaplingAiChatAccess())) {
    messageCenter.pushMessage('warning', 'global.permissionDenied', '', 'aiChat')
    return
  }

  isOpen.value = true
  await ensureChatInitialized()

  if (detail?.newChat !== false) {
    startNewChat()
  }

  draftMessage.value = prompt

  if (detail?.autoSend !== false) {
    await nextTick()
    await sendMessage()
  }
}

function closePanel() {
  cancelVoiceInput()
  stopSpeechPlayback()
  closeSaplingAiChat()
}

function openAccountSettings() {
  openSaplingAccountDialog('songbird')
}

async function ensureChatInitialized() {
  if (hasInitialized.value) {
    return
  }

  if (initializationPromise) {
    await initializationPromise
    return
  }

  initializationPromise = (async () => {
    await Promise.all([
      currentPersonStore.fetchCurrentPerson(),
      loadTranslations(),
      loadProviders(),
      loadModels(),
      loadAgents(),
      loadTranscriptionProviders(),
      loadTranscriptionModels(),
      loadSpeechProviders(),
      loadSpeechModels(),
    ])

    if (currentPersonStore.person?.handle) {
      await reloadSessions()
    }

    hasInitialized.value = true
  })()

  try {
    await initializationPromise
  } finally {
    initializationPromise = null
  }
}

async function loadAgents() {
  isLoadingAgents.value = true

  try {
    agentConfigs.value = await ApiAiService.listAgents()
    syncSelectedAgent()
    syncSelectedRuntimeTarget()
  } finally {
    isLoadingAgents.value = false
  }
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

async function loadTranscriptionProviders() {
  isLoadingTranscriptionProviders.value = true

  try {
    transcriptionProviderConfigs.value = await ApiAiService.listTranscriptionProviders()
    syncSelectedTranscriptionTarget()
  } finally {
    isLoadingTranscriptionProviders.value = false
  }
}

async function loadTranscriptionModels() {
  isLoadingTranscriptionModels.value = true

  try {
    transcriptionModelConfigs.value = await ApiAiService.listTranscriptionModels()
    syncSelectedTranscriptionTarget()
  } finally {
    isLoadingTranscriptionModels.value = false
  }
}

async function loadSpeechProviders() {
  isLoadingSpeechProviders.value = true

  try {
    speechProviderConfigs.value = await ApiAiService.listSpeechProviders()
    syncSelectedSpeechTarget()
  } finally {
    isLoadingSpeechProviders.value = false
  }
}

async function loadSpeechModels() {
  isLoadingSpeechModels.value = true

  try {
    speechModelConfigs.value = await ApiAiService.listSpeechModels()
    syncSelectedSpeechTarget()
  } finally {
    isLoadingSpeechModels.value = false
  }
}

async function reloadSessions() {
  isLoadingSessions.value = true

  try {
    sessions.value = await ApiAiService.listSessions(includeArchived.value)

    if (activeSession.value?.handle) {
      const matchedSession = sessions.value.find(
        (session) => session.handle === activeSession.value?.handle,
      )
      activeSession.value = matchedSession ?? null

      if (matchedSession) {
        syncSelectedAgent()
        await loadMessages(matchedSession.handle)
      } else {
        messages.value = []
        resetMessageWindow()
      }
    }
  } finally {
    isLoadingSessions.value = false
  }
}

async function loadMessages(
  sessionHandle?: number | null,
  options?: {
    beforeSequence?: number | null
    prepend?: boolean
  },
) {
  if (!sessionHandle) {
    messages.value = []
    resetMessageWindow()
    return
  }

  const isPrepending = options?.prepend === true

  if (isPrepending) {
    isLoadingOlderMessages.value = true
  } else {
    isLoadingMessages.value = true
  }

  try {
    const response = await ApiAiService.listMessages(sessionHandle, {
      limit: MESSAGE_PAGE_SIZE,
      beforeSequence: options?.beforeSequence ?? undefined,
    })

    messages.value = isPrepending ? mergeMessages(response.data, messages.value) : response.data
    hasMoreMessages.value = response.meta.hasMore
    nextMessageBeforeSequence.value = response.meta.nextBeforeSequence
  } finally {
    if (isPrepending) {
      isLoadingOlderMessages.value = false
    } else {
      isLoadingMessages.value = false
    }
  }
}

async function loadOlderMessages() {
  if (
    !activeSession.value?.handle ||
    !hasMoreMessages.value ||
    nextMessageBeforeSequence.value == null ||
    isLoadingOlderMessages.value
  ) {
    return
  }

  try {
    await loadMessages(activeSession.value.handle, {
      beforeSequence: nextMessageBeforeSequence.value,
      prepend: true,
    })
  } catch {
    // Errors are already surfaced by the API service via the message center.
  }
}

async function selectSession(session: AiChatSessionItem) {
  cancelVoiceInput()
  stopSpeechPlayback()
  activeSession.value = session
  selectedAgentHandle.value = getAgentHandle(session.agent)
  activeTranscriptionHandle.value = null
  editingSessionHandle.value = null
  isOpen.value = true
  await loadMessages(session.handle)

  if (isMobileLayout.value) {
    isSessionRailCollapsed.value = true
  }
}

function startNewChat() {
  cancelVoiceInput()
  stopSpeechPlayback()
  activeSession.value = null
  messages.value = []
  resetMessageWindow()
  draftMessage.value = ''
  activeTranscriptionHandle.value = null
  editingSessionHandle.value = null
  isOpen.value = true
  syncSelectedAgent()
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

  if (!value.trim()) {
    activeTranscriptionHandle.value = null
  }
}

function updateSelectedAgent(value: string) {
  if (activeSession.value?.handle) {
    return
  }

  selectedAgentHandle.value = value || null
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
  activeSession.value =
    activeSession.value?.handle === updatedSession.handle ? updatedSession : activeSession.value
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

  if (!canSendMessage.value) {
    messageCenter.pushMessage(
      'info',
      'aiChat.noConfiguredProviders',
      'aiChat.contactAdministrator',
      'aiChat',
    )
    return
  }

  isSending.value = true
  isOpen.value = true
  streamAbortController.value?.abort()
  streamAbortController.value = new AbortController()
  activeSendAttempt.value = {
    content,
    receivedServerEvents: false,
    shouldAutoPlaySpeech: activeTranscriptionHandle.value != null,
  }
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
        agentHandle: selectedAgentHandle.value ?? undefined,
        transcriptionHandle: activeTranscriptionHandle.value ?? undefined,
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
      const shouldReportToMessageCenter = !(
        error instanceof Error && /^ai\.chat\.streamFailed \(\d+\)$/.test(error.message)
      )

      handleChatRequestFailure(error, shouldReportToMessageCenter)
    }
  } finally {
    isSending.value = false
    activeSendAttempt.value = null
    activeTranscriptionHandle.value = null
  }
}

async function toggleVoiceInput() {
  if (isTranscribingVoiceInput.value) {
    return
  }

  if (isRecordingVoiceInput.value) {
    stopVoiceInput()
    return
  }

  if (!isVoiceInputAvailable.value) {
    messageCenter.pushMessage('info', 'aiChat.voiceInputUnavailable', '', 'aiChat')
    return
  }

  if (!hasConfiguredProviders.value) {
    messageCenter.pushMessage(
      'info',
      'aiChat.noConfiguredProviders',
      'aiChat.contactAdministrator',
      'aiChat',
    )
    return
  }

  if (!hasConfiguredTranscriptionProviders.value) {
    messageCenter.pushMessage(
      'info',
      'ai.transcriptionProviderNotConfigured',
      'aiChat.contactAdministrator',
      'aiChat',
    )
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)

    pendingVoiceChunks = []
    discardPendingVoiceRecording = false
    voiceRecordingStartedAt = Date.now()
    activeVoiceStream.value = stream
    activeVoiceRecorder.value = recorder
    isRecordingVoiceInput.value = true
    startVoiceInputSilenceMonitoring(stream)

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        pendingVoiceChunks.push(event.data)
      }
    })

    recorder.addEventListener('stop', () => {
      const mimeType = recorder.mimeType || 'audio/webm'
      const durationSeconds =
        voiceRecordingStartedAt != null
          ? Math.max(0, (Date.now() - voiceRecordingStartedAt) / 1000)
          : undefined

      isRecordingVoiceInput.value = false
      voiceRecordingStartedAt = null
      stopVoiceInputSilenceMonitoring()
      stopVoiceStreamTracks()
      activeVoiceRecorder.value = null

      const chunks = pendingVoiceChunks
      pendingVoiceChunks = []

      if (discardPendingVoiceRecording || chunks.length === 0) {
        discardPendingVoiceRecording = false
        return
      }

      void uploadVoiceRecording(new Blob(chunks, { type: mimeType }), mimeType, durationSeconds)
    })

    recorder.start()
  } catch (error) {
    messageCenter.pushMessage(
      'error',
      error instanceof Error && error.message.trim()
        ? error.message
        : 'aiChat.microphoneAccessFailed',
      '',
      'aiChat',
    )
    cancelVoiceInput()
  }
}

function stopVoiceInput() {
  if (!activeVoiceRecorder.value || activeVoiceRecorder.value.state === 'inactive') {
    return
  }

  activeVoiceRecorder.value.stop()
}

function cancelVoiceInput() {
  discardPendingVoiceRecording = true

  if (activeVoiceRecorder.value && activeVoiceRecorder.value.state !== 'inactive') {
    activeVoiceRecorder.value.stop()
  }

  pendingVoiceChunks = []
  isRecordingVoiceInput.value = false
  isTranscribingVoiceInput.value = false
  voiceRecordingStartedAt = null
  stopVoiceInputSilenceMonitoring()
  activeVoiceRecorder.value = null
  stopVoiceStreamTracks()
}

function stopVoiceStreamTracks() {
  if (!activeVoiceStream.value) {
    return
  }

  for (const track of activeVoiceStream.value.getTracks()) {
    track.stop()
  }

  activeVoiceStream.value = null
}

function startVoiceInputSilenceMonitoring(stream: MediaStream) {
  stopVoiceInputSilenceMonitoring()

  const webkitWindow = window as Window & { webkitAudioContext?: typeof AudioContext }
  const audioContextConstructor = window.AudioContext ?? webkitWindow.webkitAudioContext

  if (!audioContextConstructor) {
    return
  }

  try {
    const audioContext = new audioContextConstructor()
    const analyser = audioContext.createAnalyser()
    const sourceNode = audioContext.createMediaStreamSource(stream)

    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.1
    sourceNode.connect(analyser)

    const sampleBuffer = new Uint8Array(analyser.fftSize)

    activeVoiceAudioContext.value = audioContext
    activeVoiceAnalyser.value = analyser
    activeVoiceSourceNode.value = sourceNode
    lastDetectedVoiceActivityAt = Date.now()

    void audioContext.resume().catch(() => undefined)

    voiceInputSilenceMonitorTimer = window.setInterval(() => {
      if (
        !isRecordingVoiceInput.value ||
        !activeVoiceRecorder.value ||
        activeVoiceRecorder.value.state === 'inactive'
      ) {
        return
      }

      analyser.getByteTimeDomainData(sampleBuffer)

      let sumSquares = 0

      for (const sample of sampleBuffer) {
        const normalizedSample = (sample - 128) / 128
        sumSquares += normalizedSample * normalizedSample
      }

      const rms = Math.sqrt(sumSquares / sampleBuffer.length)
      const now = Date.now()

      if (rms >= VOICE_INPUT_SILENCE_THRESHOLD) {
        lastDetectedVoiceActivityAt = now
        return
      }

      const recordingStartedAt = voiceRecordingStartedAt ?? now
      const lastActivityAt = lastDetectedVoiceActivityAt ?? recordingStartedAt

      if (now - recordingStartedAt < VOICE_INPUT_INITIAL_GRACE_PERIOD_MS) {
        return
      }

      if (now - lastActivityAt >= VOICE_INPUT_SILENCE_STOP_DELAY_MS) {
        stopVoiceInput()
      }
    }, VOICE_INPUT_SILENCE_MONITOR_INTERVAL_MS)
  } catch {
    stopVoiceInputSilenceMonitoring()
  }
}

function stopVoiceInputSilenceMonitoring() {
  if (voiceInputSilenceMonitorTimer != null) {
    window.clearInterval(voiceInputSilenceMonitorTimer)
    voiceInputSilenceMonitorTimer = null
  }

  lastDetectedVoiceActivityAt = null

  activeVoiceSourceNode.value?.disconnect()
  activeVoiceAnalyser.value?.disconnect()
  activeVoiceSourceNode.value = null
  activeVoiceAnalyser.value = null

  const audioContext = activeVoiceAudioContext.value
  activeVoiceAudioContext.value = null
  void audioContext?.close().catch(() => undefined)
}

async function uploadVoiceRecording(blob: Blob, mimeType: string, durationSeconds?: number) {
  isTranscribingVoiceInput.value = true

  try {
    const response = await ApiAiService.createTranscription(
      blob,
      {
        sessionHandle: activeSession.value?.handle ?? undefined,
        providerHandle: selectedTranscriptionProviderHandle.value ?? undefined,
        modelHandle: selectedTranscriptionModelHandle.value ?? undefined,
        routeName: route.name != null ? String(route.name) : undefined,
        url: window.location.href,
        pageTitle: document.title || undefined,
        durationSeconds,
      },
      buildVoiceRecordingFilename(mimeType),
    )

    const transcript = response.transcript?.trim() ?? ''

    if (!transcript) {
      messageCenter.pushMessage('info', 'aiChat.noSpeechDetected', '', 'aiChat')
      activeTranscriptionHandle.value = null
      return
    }

    draftMessage.value = draftMessage.value.trim()
      ? `${draftMessage.value.trim()}\n\n${transcript}`
      : transcript
    activeTranscriptionHandle.value = response.transcriptionHandle
    await nextTick()
    void sendMessage()
  } catch {
    activeTranscriptionHandle.value = null
  } finally {
    isTranscribingVoiceInput.value = false
  }
}

function buildVoiceRecordingFilename(mimeType: string) {
  if (mimeType.includes('ogg')) {
    return 'sapling-chat-audio.ogg'
  }

  if (mimeType.includes('wav')) {
    return 'sapling-chat-audio.wav'
  }

  if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
    return 'sapling-chat-audio.m4a'
  }

  return 'sapling-chat-audio.webm'
}

function handleStreamEvent(event: AiChatStreamEvent) {
  switch (event.type) {
    case 'session.upsert':
      markActiveSendAttemptAsStarted()
      if (event.session) {
        replaceSession(event.session)
        activeSession.value = event.session
      }
      break
    case 'message.user':
    case 'message.assistant':
    case 'message.completed':
      markActiveSendAttemptAsStarted()
      if (event.message) {
        upsertMessage(event.message)
        const currentSendAttempt = activeSendAttempt.value
        if (
          event.type === 'message.completed' &&
          event.message.role === 'assistant' &&
          currentSendAttempt?.shouldAutoPlaySpeech
        ) {
          activeSendAttempt.value = {
            ...currentSendAttempt,
            shouldAutoPlaySpeech: false,
          }
          void autoPlayAssistantSpeech(event.message)
        }
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
    case 'tool.action.pending':
      if (event.action) {
        upsertToolAction(event.action)
      }
      break
    case 'error':
      handleChatRequestFailure(event.messageText ?? event.type)
      break
  }
}

async function confirmToolAction(action: AiChatToolActionItem) {
  if (!action.handle) {
    return
  }

  const updatedAction = await ApiAiService.confirmToolAction(action.handle)
  upsertToolAction(updatedAction)
}

async function rejectToolAction(action: AiChatToolActionItem) {
  if (!action.handle) {
    return
  }

  const updatedAction = await ApiAiService.rejectToolAction(action.handle)
  upsertToolAction(updatedAction)
}

function upsertToolAction(action: AiChatToolActionItem) {
  const messageHandle =
    typeof action.message === 'number'
      ? action.message
      : action.message && typeof action.message === 'object'
        ? action.message.handle
        : null

  if (!messageHandle) {
    return
  }

  const message = messages.value.find((item) => item.handle === messageHandle)
  if (!message) {
    return
  }

  const responsePayload =
    message.responsePayload && typeof message.responsePayload === 'object'
      ? { ...(message.responsePayload as Record<string, unknown>) }
      : {}
  const existingActions = Array.isArray(responsePayload.pendingToolActions)
    ? responsePayload.pendingToolActions.filter(isToolAction)
    : []
  const actionIndex = existingActions.findIndex((item) => item.handle === action.handle)

  if (actionIndex >= 0) {
    existingActions.splice(actionIndex, 1, action)
  } else {
    existingActions.push(action)
  }

  responsePayload.pendingToolActions = existingActions
  message.responsePayload = responsePayload
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

function syncSelectedRuntimeTarget() {
  const sessionProviderHandle = getProviderHandle(activeSession.value?.provider)
  const sessionModelHandle = getModelHandle(activeSession.value?.model)
  const selectedAgent = agentConfigs.value.find(
    (agent) => agent.handle === selectedAgentHandle.value,
  )
  const target = resolveRuntimeTarget({
    providerConfigs: providerConfigs.value,
    modelConfigs: modelConfigs.value,
    requestedProviderHandle: sessionProviderHandle ?? getProviderHandle(selectedAgent?.provider),
    requestedModelHandle: sessionModelHandle ?? getModelHandle(selectedAgent?.model),
    preferredModelHandle: selectedModelHandle.value,
  })

  selectedProviderHandle.value = target.providerHandle
  selectedModelHandle.value = target.modelHandle
}

function syncSelectedAgent() {
  const sessionAgentHandle = getAgentHandle(activeSession.value?.agent)
  const availableHandles = new Set(agentConfigs.value.map((agent) => agent.handle))

  if (sessionAgentHandle && availableHandles.has(sessionAgentHandle)) {
    selectedAgentHandle.value = sessionAgentHandle
    return
  }

  if (selectedAgentHandle.value && availableHandles.has(selectedAgentHandle.value)) {
    return
  }

  selectedAgentHandle.value =
    agentConfigs.value.find((agent) => agent.isDefault)?.handle ??
    agentConfigs.value[0]?.handle ??
    null
}

function getAgentHandle(agent?: AiAgentItem | string | null) {
  if (!agent) {
    return null
  }

  return typeof agent === 'string' ? agent : agent.handle
}

function isToolAction(value: unknown): value is AiChatToolActionItem {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { toolName?: unknown }).toolName === 'string'
  )
}

function syncSelectedTranscriptionTarget() {
  const target = resolveRuntimeTarget({
    providerConfigs: transcriptionProviderConfigs.value,
    modelConfigs: transcriptionModelConfigs.value,
    requestedProviderHandle: selectedTranscriptionProviderHandle.value,
    requestedModelHandle: selectedTranscriptionModelHandle.value,
    preferredModelHandle: selectedTranscriptionModelHandle.value,
  })

  selectedTranscriptionProviderHandle.value = target.providerHandle
  selectedTranscriptionModelHandle.value = target.modelHandle
}

function syncSelectedSpeechTarget() {
  const target = resolveRuntimeTarget({
    providerConfigs: speechProviderConfigs.value,
    modelConfigs: speechModelConfigs.value,
    requestedProviderHandle: selectedSpeechProviderHandle.value,
    requestedModelHandle: selectedSpeechModelHandle.value,
    preferredModelHandle: selectedSpeechModelHandle.value,
  })

  selectedSpeechProviderHandle.value = target.providerHandle
  selectedSpeechModelHandle.value = target.modelHandle
}

function markActiveSendAttemptAsStarted() {
  if (!activeSendAttempt.value) {
    return
  }

  activeSendAttempt.value.receivedServerEvents = true
}

function handleChatRequestFailure(error: unknown, reportToMessageCenter = true) {
  const messageKey = normalizeChatErrorMessage(error)

  if (reportToMessageCenter) {
    messageCenter.pushMessage('error', messageKey, '', 'aiChat')
  }

  if (activeSendAttempt.value?.receivedServerEvents && activeSession.value?.handle) {
    void loadMessages(activeSession.value.handle).catch(() => undefined)
    return
  }

  appendLocalFailedExchange({
    content: activeSendAttempt.value?.content ?? '',
    errorMessage: messageKey,
    personHandle: currentPersonStore.person?.handle ?? 0,
    sessionHandle: activeSession.value?.handle ?? 0,
  })
}

function normalizeChatErrorMessage(error: unknown) {
  const rawMessage =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : 'ai.chat.streamFailed'

  const trimmedMessage = rawMessage.trim()

  if (!trimmedMessage) {
    return 'ai.chat.streamFailed'
  }

  if (trimmedMessage.startsWith('ai.chat.streamFailed')) {
    return 'ai.chat.streamFailed'
  }

  return /^[a-z]+(?:\.[a-zA-Z0-9_-]+)+$/.test(trimmedMessage)
    ? trimmedMessage
    : 'ai.chat.streamFailed'
}
</script>
