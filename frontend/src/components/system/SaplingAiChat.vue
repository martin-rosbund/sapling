<template>
  <div class="sapling-ai-chat-shell">
    <div v-if="isOpen" class="sapling-ai-chat__backdrop" @click="closePanel"></div>

    <transition name="sapling-ai-chat-panel">
      <section v-if="isOpen" class="glass-panel sapling-ai-chat" @click.stop>
        <template v-if="!isTranslationLoading">
          <div class="sapling-ai-chat__header">
            <div>
              <div class="sapling-ai-chat__eyebrow">{{ translate('aiChat.titleEyebrow', 'AI') }}</div>
              <div class="sapling-ai-chat__title">{{ translate('aiChat.title', 'Chat') }}</div>
            </div>

            <div class="sapling-ai-chat__header-actions">
              <v-btn size="small" variant="text" prepend-icon="mdi-refresh" @click="reloadSessions">
                {{ translate('aiChat.refresh', 'Refresh') }}
              </v-btn>
              <v-btn size="small" color="primary" prepend-icon="mdi-plus" @click="startNewChat">
                {{ translate('aiChat.newChat', 'New chat') }}
              </v-btn>
              <v-btn icon="mdi-close" variant="text" size="small" @click="closePanel" />
            </div>
          </div>

          <v-progress-linear v-if="isBusy" indeterminate color="primary" />

          <div class="sapling-ai-chat__layout">
            <aside class="sapling-ai-chat__sessions">
              <div class="sapling-ai-chat__sessions-header">
                <span>{{ translate('aiChat.sessions', 'Sessions') }}</span>
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
                      {{ translate('aiChat.showArchived', 'Archived') }}
                    </span>
                  </template>
                </v-switch>
              </div>

              <div v-if="sessions.length === 0" class="sapling-ai-chat__empty-state">
                {{ translate('aiChat.noSessions', 'No chats yet.') }}
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
                      <div class="sapling-ai-chat__session-title">{{ session.title }}</div>
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
                <div class="sapling-ai-chat__conversation-title">
                  {{ activeSession?.title || translate('aiChat.draftConversation', 'New conversation') }}
                </div>
                <div class="sapling-ai-chat__conversation-subtitle">
                  {{ activeSession?.provider || translate('aiChat.localDraft', 'Draft mode') }}
                </div>
              </div>

              <div ref="messageContainer" class="sapling-ai-chat__messages">
                <div v-if="messages.length === 0" class="sapling-ai-chat__empty-state">
                  {{ translate('aiChat.noMessages', 'Start the first conversation message.') }}
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
                    {{ message.role }}
                    <span v-if="message.status === 'streaming'" class="sapling-ai-chat__message-status">
                      {{ translate('aiChat.streaming', 'streaming') }}
                    </span>
                  </div>
                  <div class="sapling-ai-chat__message-content">{{ message.content }}</div>
                </div>
              </div>

              <div class="sapling-ai-chat__composer">
                <v-textarea
                  v-model="draftMessage"
                  :placeholder="translate('aiChat.inputPlaceholder', 'Ask a question and include the current page context.')"
                  auto-grow
                  density="comfortable"
                  hide-details
                  rows="3"
                  variant="outlined"
                  @keydown.enter.exact.prevent="sendMessage"
                />

                <div class="sapling-ai-chat__composer-actions">
                  <div class="sapling-ai-chat__composer-context">
                    {{ route.fullPath }}
                  </div>
                  <v-btn color="primary" :loading="isSending" @click="sendMessage">
                    {{ translate('aiChat.send', 'Send') }}
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
import type { AiChatMessageItem, AiChatSessionItem } from '@/entity/entity'
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'
import ApiAiService, { type AiChatStreamEvent } from '@/services/api.ai.service'
import { useSaplingAiChat } from '@/composables/system/useSaplingAiChat'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'

const route = useRoute()
const currentPersonStore = useCurrentPersonStore()
const messageCenter = useSaplingMessageCenter()
const { t, te } = useI18n()
const { isLoading: isTranslationLoading, loadTranslations } = useTranslationLoader('aiChat')

const { isOpen, closeSaplingAiChat, toggleSaplingAiChat } = useSaplingAiChat()
const includeArchived = ref(false)
const isLoadingSessions = ref(false)
const isLoadingMessages = ref(false)
const isSending = ref(false)
const sessions = ref<AiChatSessionItem[]>([])
const messages = ref<AiChatMessageItem[]>([])
const activeSession = ref<AiChatSessionItem | null>(null)
const draftMessage = ref('')
const editingSessionHandle = ref<number | null>(null)
const editingSessionTitle = ref('')
const messageContainer = ref<HTMLElement | null>(null)
const streamAbortController = ref<AbortController | null>(null)

const isBusy = computed(
  () => isLoadingSessions.value || isLoadingMessages.value || isSending.value,
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
  await Promise.all([currentPersonStore.fetchCurrentPerson(), loadTranslations()])

  if (currentPersonStore.person?.handle) {
    await reloadSessions()
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  streamAbortController.value?.abort()
})

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closePanel()
  }
}

function translate(key: string, fallback: string) {
  return te(key) ? t(key) : fallback
}

function togglePanel() {
  toggleSaplingAiChat()
}

function closePanel() {
  closeSaplingAiChat()
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

  messages.value = [...messages.value].sort((left, right) => left.sequence - right.sequence)
}

function appendMessageDelta(handle: number, delta: string) {
  const message = messages.value.find((item) => item.handle === handle)
  if (!message || !delta) {
    return
  }

  message.content += delta
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

function formatSessionMeta(session: AiChatSessionItem) {
  const date = session.lastMessageAt || session.updatedAt || session.createdAt

  if (!date) {
    return session.isArchived
      ? translate('aiChat.archived', 'Archived')
      : translate('aiChat.active', 'Active')
  }

  const prefix = session.isArchived
    ? `${translate('aiChat.archived', 'Archived')} • `
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
  height: min(78vh, 760px);
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: 28px;
  overflow: hidden;
  z-index: 1251;
}

.sapling-ai-chat::after {
  content: '';
  position: absolute;
  right: 30px;
  bottom: -12px;
  width: 26px;
  height: 26px;
  transform: rotate(45deg);
  background: rgba(26, 32, 44, 0.94);
  border-right: 1px solid var(--sapling-surface-border);
  border-bottom: 1px solid var(--sapling-surface-border);
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

.sapling-ai-chat__session-title {
  font-weight: 600;
  word-break: break-word;
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
  padding: 16px 20px;
  border-bottom: 1px solid var(--sapling-surface-border);
}

.sapling-ai-chat__conversation-title {
  font-size: 1.05rem;
  font-weight: 600;
}

.sapling-ai-chat__conversation-subtitle {
  margin-top: 4px;
  font-size: 0.82rem;
  opacity: 0.68;
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
  text-transform: uppercase;
  letter-spacing: 0.12em;
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
  font-size: 0.78rem;
  opacity: 0.68;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  .sapling-ai-chat__composer-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .sapling-ai-chat::after {
    right: 20px;
  }
}
</style>