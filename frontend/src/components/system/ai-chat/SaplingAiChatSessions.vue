<template>
  <aside
    class="sapling-ai-chat__sessions"
    :class="{
      'sapling-ai-chat__sessions--collapsible': isCollapsible,
      'sapling-ai-chat__sessions--collapsed': isCollapsible && isCollapsed,
    }"
  >
    <div class="sapling-ai-chat__sessions-header">
      <button
        v-if="isCollapsible"
        type="button"
        class="sapling-ai-chat__sessions-toggle"
        :aria-expanded="!isCollapsed"
        :title="t('aiChat.sessions')"
        @click="emit('toggleCollapse')"
      >
        <span class="sapling-ai-chat__sessions-toggle-copy">
          <span class="sapling-ai-chat__sessions-toggle-label">{{ t('aiChat.sessions') }}</span>
          <span class="sapling-ai-chat__sessions-toggle-meta">{{ sessionRailSummary }}</span>
        </span>
        <v-icon :icon="isCollapsed ? 'mdi-chevron-down' : 'mdi-chevron-up'" size="small" />
      </button>
      <span v-else>{{ t('aiChat.sessions') }}</span>
      <v-switch
        :model-value="includeArchived"
        color="primary"
        density="compact"
        hide-details
        inset
        @update:model-value="handleIncludeArchivedUpdate"
      >
        <template #label>
          <span class="sapling-ai-chat__switch-label">
            {{ t('aiChat.showArchived') }}
          </span>
        </template>
      </v-switch>
    </div>

    <div v-if="!isCollapsed && sessions.length === 0" class="sapling-ai-chat__empty-state">
      {{ t('aiChat.noSessions') }}
    </div>

    <div v-else-if="!isCollapsed" class="sapling-ai-chat__session-list">
      <button
        v-for="session in sessions"
        :key="session.handle ?? session.title"
        type="button"
        class="sapling-ai-chat__session-item"
        :class="{ 'sapling-ai-chat__session-item--active': session.handle === activeSessionHandle }"
        @click="emit('select', session)"
      >
        <div class="sapling-ai-chat__session-top">
          <div class="sapling-ai-chat__session-meta">
            {{ formatSessionMeta(session) }}
          </div>

          <div class="sapling-ai-chat__session-actions">
            <v-btn
              v-if="editingSessionHandle === session.handle"
              icon="mdi-check"
              size="x-small"
              variant="text"
              @click.stop="emit('saveTitle', session)"
            />
            <v-btn
              v-else
              icon="mdi-pencil-outline"
              size="x-small"
              variant="text"
              @click.stop="emit('beginRename', session)"
            />
            <v-btn
              icon="mdi-archive-outline"
              size="x-small"
              variant="text"
              @click.stop="emit('toggleArchive', session)"
            />
          </div>
        </div>

        <div class="sapling-ai-chat__session-main">
          <template v-if="editingSessionHandle === session.handle">
            <v-text-field
              v-model="editingSessionTitleModel"
              density="compact"
              hide-details
              autofocus
              @click.stop
              @keyup.enter="emit('saveTitle', session)"
            />
          </template>
          <template v-else>
            <div class="sapling-ai-chat__session-title-row">
              <div class="sapling-ai-chat__session-title">
                {{ getTruncatedTitle(session.title) }}
              </div>
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
          </template>
        </div>
      </button>
    </div>
  </aside>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AiChatSessionItem } from '@/entity/entity'

const props = withDefaults(
  defineProps<{
    sessions: AiChatSessionItem[]
    activeSessionHandle: number | null
    activeSessionTitle?: string
    includeArchived: boolean
    editingSessionHandle: number | null
    editingSessionTitle: string
    isCollapsible?: boolean
    isCollapsed?: boolean
    titlePreviewLimit?: number
  }>(),
  {
    activeSessionTitle: '',
    isCollapsible: false,
    isCollapsed: false,
    titlePreviewLimit: 30,
  },
)

const emit = defineEmits<{
  (event: 'update:includeArchived', value: boolean): void
  (event: 'update:editingSessionTitle', value: string): void
  (event: 'toggleCollapse'): void
  (event: 'select', session: AiChatSessionItem): void
  (event: 'beginRename', session: AiChatSessionItem): void
  (event: 'saveTitle', session: AiChatSessionItem): void
  (event: 'toggleArchive', session: AiChatSessionItem): void
}>()

const { t } = useI18n()

const sessionRailSummary = computed(() => {
  if (props.activeSessionTitle?.trim()) {
    return getTruncatedTitle(props.activeSessionTitle)
  }

  if (props.sessions.length === 0) {
    return t('aiChat.noSessions')
  }

  return String(props.sessions.length)
})

const editingSessionTitleModel = computed({
  get: () => props.editingSessionTitle,
  set: (value: string) => emit('update:editingSessionTitle', value),
})

function handleIncludeArchivedUpdate(value: boolean | null) {
  emit('update:includeArchived', Boolean(value))
}

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

function formatSessionMeta(session: AiChatSessionItem) {
  const date = session.lastMessageAt || session.updatedAt || session.createdAt

  if (!date) {
    return session.isArchived ? t('aiChat.archived') : t('aiChat.active')
  }

  return `${new Date(date).toLocaleString()}`
}
</script>
