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
          :class="{ 'sapling-ai-chat__tool-action--compact': action.status !== 'pending' }"
        >
          <div class="sapling-row-between-md sapling-ai-chat__tool-action-header">
            <div class="sapling-ai-chat__tool-action-copy">
              <strong class="sapling-ai-chat__tool-action-title">{{
                getToolActionTitle(action)
              }}</strong>
              <span
                v-if="getToolActionSummary(action)"
                class="sapling-ai-chat__tool-action-summary"
              >
                {{ getToolActionSummary(action) }}
              </span>
            </div>
            <div class="sapling-ai-chat__tool-action-meta">
              <v-chip size="small" variant="tonal">{{ getToolActionStatusLabel(action) }}</v-chip>
            </div>
          </div>
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
            v-if="action.status === 'pending' && action.handle"
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
            <v-btn
              v-if="hasToolActionTechnicalDetails(action)"
              size="small"
              variant="text"
              prepend-icon="mdi-information-outline"
              @click="openToolActionTechnicalDetails(action)"
            >
              {{ getToolActionDetailsButtonLabel() }}
            </v-btn>
          </div>
          <div
            v-else-if="
              hasToolActionTechnicalDetails(action) ||
              getToolActionNavigationLinks(action).length > 0
            "
            class="sapling-row-xs sapling-ai-chat__tool-action-actions"
          >
            <v-btn
              v-for="link in getToolActionNavigationLinks(action)"
              :key="`${action.handle ?? `${action.serverName}.${action.toolName}`}-${link.path}`"
              size="small"
              variant="tonal"
              prepend-icon="mdi-open-in-app"
              @click="openNavigationLink(link.path)"
            >
              {{ getNavigationLinkLabel(link) }}
            </v-btn>
            <v-btn
              v-if="hasToolActionTechnicalDetails(action)"
              size="small"
              variant="text"
              prepend-icon="mdi-information-outline"
              @click="openToolActionTechnicalDetails(action)"
            >
              {{ getToolActionDetailsButtonLabel() }}
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
          {{ getNavigationLinkLabel(link) }}
        </v-btn>
      </div>
    </div>
    <v-dialog
      :model-value="!!activeToolActionDetails"
      max-width="760"
      class="sapling-dialog-medium sapling-ai-chat__tool-action-details-dialog"
      @update:model-value="handleToolActionDetailsDialogUpdate"
    >
      <SaplingDialogCard class="sapling-ai-chat__tool-action-details-card" :tilt="false">
        <div class="sapling-dialog-shell sapling-ai-chat__tool-action-details-shell">
          <SaplingDialogHero
            :eyebrow="getToolActionDetailsButtonLabel()"
            :title="getActiveToolActionDetailsTitle()"
          />
          <div class="sapling-ai-chat__tool-action-details-body">
            <p v-if="activeToolActionDetails" class="sapling-ai-chat__tool-action-details-intro">
              {{ getToolActionTechnicalDetailsIntro(activeToolActionDetails) }}
            </p>
            <div
              v-if="
                activeToolActionDetails &&
                getToolActionPreviewRows(activeToolActionDetails).length > 0
              "
              class="sapling-ai-chat__tool-action-preview"
            >
              <div
                v-for="row in getToolActionPreviewRows(activeToolActionDetails)"
                :key="row.key"
                class="sapling-ai-chat__tool-action-preview-row"
              >
                <span class="sapling-ai-chat__tool-action-preview-label">{{ row.label }}</span>
                <span class="sapling-ai-chat__tool-action-preview-value">{{ row.value }}</span>
              </div>
            </div>
            <v-expansion-panels
              v-if="activeToolActionDetails"
              class="sapling-ai-chat__tool-action-technical-panel"
              variant="accordion"
            >
              <v-expansion-panel>
                <v-expansion-panel-title>{{ getTechnicalRawDataLabel() }}</v-expansion-panel-title>
                <v-expansion-panel-text>
                  <pre
                    class="sapling-ai-chat__tool-action-arguments sapling-ai-chat__tool-action-arguments--dialog"
                    >{{ formatToolActionTechnicalDetails(activeToolActionDetails) }}</pre
                  >
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </div>
          <SaplingActionBar>
            <template #leading>
              <v-btn
                variant="text"
                prepend-icon="mdi-close"
                @click="closeToolActionTechnicalDetails"
              >
                {{ getCloseButtonLabel() }}
              </v-btn>
            </template>
          </SaplingActionBar>
        </div>
      </SaplingDialogCard>
    </v-dialog>
  </div>
</template>

<script lang="ts" setup>
import { nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import SaplingActionBar from '@/components/actions/SaplingActionBar.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import SaplingMarkdownContent from '@/components/common/SaplingMarkdownContent.vue'
import SaplingDialogCard from '@/components/dialog/SaplingDialogCard.vue'
import type { AiChatMessageItem, AiChatToolActionItem } from '@/entity/entity'

interface ChatNavigationLink {
  path: string
  entityHandle: string
  kind: 'list' | 'record' | 'route'
  intent?: 'searchResults' | 'record' | 'route' | 'mutationResult' | 'none'
  label?: string
  resultCount?: number | null
  recordHandles?: Array<string | number>
  toolName?: string
  isPrimary?: boolean
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

interface ToolActionPreviewRow {
  key: string
  label: string
  value: string
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
const activeToolActionDetails = ref<AiChatToolActionItem | null>(null)
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

function getToolActionTitle(action: AiChatToolActionItem) {
  const kind = getToolActionKind(action)
  const entityLabel = getToolActionEntityLabel(action)
  const entityResultTitle = getToolActionEntityResultTitle(kind, action.status, entityLabel)

  if (entityResultTitle) {
    return entityResultTitle
  }

  const key = `aiChat.toolActionTitle.${kind}.${action.status}`

  if (te(key)) {
    return t(key)
  }

  const fallback = getToolActionTitleFallback(kind, action.status)
  return fallback ?? (te('aiChat.toolActionTitle') ? t('aiChat.toolActionTitle') : 'Aktion')
}

function getToolActionEntityResultTitle(kind: string, status: string, entityLabel: string | null) {
  if (!entityLabel || status !== 'executed') {
    return null
  }

  if (kind === 'create') {
    return `${entityLabel} angelegt`
  }

  if (kind === 'update') {
    return `${entityLabel} bearbeitet`
  }

  if (kind === 'delete') {
    return `${entityLabel} gelöscht`
  }

  return null
}

function getToolActionTitleFallback(kind: string, status: string) {
  const titleByKindAndStatus: Record<string, Record<string, string>> = {
    create: {
      pending: 'Anlage bestätigen',
      executed: 'Anlage ausgeführt',
      failed: 'Anlage fehlgeschlagen',
      rejected: 'Anlage abgelehnt',
      expired: 'Anlage abgelaufen',
    },
    update: {
      pending: 'Bearbeitung bestätigen',
      executed: 'Bearbeitung ausgeführt',
      failed: 'Bearbeitung fehlgeschlagen',
      rejected: 'Bearbeitung abgelehnt',
      expired: 'Bearbeitung abgelaufen',
    },
    delete: {
      pending: 'Löschen bestätigen',
      executed: 'Löschung ausgeführt',
      failed: 'Löschung fehlgeschlagen',
      rejected: 'Löschung abgelehnt',
      expired: 'Löschung abgelaufen',
    },
    importConfigure: {
      pending: 'Import konfigurieren bestätigen',
      executed: 'Import konfiguriert',
      failed: 'Import-Konfiguration fehlgeschlagen',
      rejected: 'Import-Konfiguration abgelehnt',
      expired: 'Import-Konfiguration abgelaufen',
    },
    importExecute: {
      pending: 'Import ausführen bestätigen',
      executed: 'Import ausgeführt',
      failed: 'Import fehlgeschlagen',
      rejected: 'Import abgelehnt',
      expired: 'Import abgelaufen',
    },
  }

  return titleByKindAndStatus[kind]?.[status] ?? titleByKindAndStatus.action?.[status] ?? null
}

function getToolActionKind(action: AiChatToolActionItem) {
  if (action.toolName === 'generic_create') {
    return 'create'
  }

  if (action.toolName === 'generic_update') {
    return 'update'
  }

  if (action.toolName === 'generic_delete') {
    return 'delete'
  }

  if (action.toolName === 'import_configure_batch') {
    return 'importConfigure'
  }

  if (action.toolName === 'import_execute_batch') {
    return 'importExecute'
  }

  return 'action'
}

function getToolActionSummary(action: AiChatToolActionItem) {
  const entityLabel = getToolActionEntityLabel(action)

  if (entityLabel && action.status === 'pending') {
    return entityLabel
  }

  if (entityLabel && action.status === 'failed') {
    return entityLabel
  }

  if (action.toolName === 'import_configure_batch' || action.toolName === 'import_execute_batch') {
    return 'Import'
  }

  return ''
}

function getToolActionEntityLabel(action: AiChatToolActionItem) {
  const entityHandle =
    extractEntityHandle(action.arguments) ?? extractEntityHandle(action.resultPayload)
  return entityHandle ? getNavigationEntityLabel(entityHandle, 1) : null
}

function hasToolActionTechnicalDetails(action: AiChatToolActionItem) {
  return (
    hasPayloadContent(action.arguments) ||
    hasPayloadContent(action.resultPayload) ||
    hasPayloadContent(action.errorPayload)
  )
}

function hasPayloadContent(value: unknown) {
  if (value == null) {
    return false
  }

  if (Array.isArray(value)) {
    return value.length > 0
  }

  if (typeof value === 'object') {
    return Object.keys(value).length > 0
  }

  return true
}

function getToolActionDetailsButtonLabel() {
  return te('aiChat.toolActionDetails') ? t('aiChat.toolActionDetails') : 'Details'
}

function getTechnicalRawDataLabel() {
  return te('aiChat.toolActionTechnicalRawData')
    ? t('aiChat.toolActionTechnicalRawData')
    : 'Technische Rohdaten'
}

function openToolActionTechnicalDetails(action: AiChatToolActionItem) {
  activeToolActionDetails.value = action
}

function closeToolActionTechnicalDetails() {
  activeToolActionDetails.value = null
}

function handleToolActionDetailsDialogUpdate(isOpen: boolean) {
  if (!isOpen) {
    closeToolActionTechnicalDetails()
  }
}

function getActiveToolActionDetailsTitle() {
  return activeToolActionDetails.value
    ? getToolActionTitle(activeToolActionDetails.value)
    : getToolActionDetailsButtonLabel()
}

function getToolActionTechnicalDetailsIntro(action: AiChatToolActionItem) {
  const entityLabel = getToolActionEntityLabel(action)

  if (action.status === 'executed') {
    return entityLabel
      ? `${entityLabel}: die ausgeführte Aktion im Überblick.`
      : 'Die ausgeführte Aktion im Überblick.'
  }

  if (action.status === 'failed') {
    return entityLabel
      ? `${entityLabel}: die Aktion konnte nicht ausgeführt werden.`
      : 'Die Aktion konnte nicht ausgeführt werden.'
  }

  return entityLabel
    ? `${entityLabel}: prüfen Sie die geplanten Angaben vor der Ausführung.`
    : 'Prüfen Sie die geplanten Angaben vor der Ausführung.'
}

function getToolActionPreviewRows(action: AiChatToolActionItem): ToolActionPreviewRow[] {
  const args = asRecord(action.arguments)
  const entityHandle =
    extractEntityHandle(action.arguments) ?? extractEntityHandle(action.resultPayload)
  const rows: ToolActionPreviewRow[] = []

  if (entityHandle) {
    rows.push({
      key: 'entityHandle',
      label: 'Datensatztyp',
      value: getNavigationEntityLabel(entityHandle, 1),
    })
  }

  const recordHandle = extractHandleValue(args?.handle)

  if (recordHandle != null) {
    rows.push({
      key: 'handle',
      label: 'Datensatz',
      value: String(recordHandle),
    })
  }

  const data = asRecord(args?.data)

  if (data) {
    for (const [key, value] of Object.entries(data)) {
      rows.push({
        key: `data.${key}`,
        label: getToolActionFieldLabel(entityHandle, key),
        value: formatToolActionPreviewValue(value),
      })
    }
  }

  if (rows.length <= (entityHandle ? 1 : 0) && args) {
    const skippedArgumentKeys = new Set(['entityHandle', 'data', 'relations'])

    for (const [key, value] of Object.entries(args)) {
      if (skippedArgumentKeys.has(key)) {
        continue
      }

      rows.push({
        key: `argument.${key}`,
        label: getToolActionFieldLabel(entityHandle, key),
        value: formatToolActionPreviewValue(value),
      })
    }
  }

  return rows.slice(0, 24)
}

function getToolActionFieldLabel(entityHandle: string | null, fieldName: string) {
  const fieldKey = entityHandle ? `${entityHandle}.${fieldName}` : ''

  if (fieldKey && te(fieldKey)) {
    return String(t(fieldKey)).trim()
  }

  return humanizeEntityHandle(fieldName)
}

function formatToolActionPreviewValue(value: unknown): string {
  if (value == null) {
    return 'leer'
  }

  if (typeof value === 'boolean') {
    return value ? 'Ja' : 'Nein'
  }

  if (typeof value === 'string') {
    return value.trim() || 'leer'
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'leer'
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'leer'
    }

    const preview = value.slice(0, 5).map(formatToolActionPreviewValue).join(', ')
    return value.length > 5 ? `${preview}, ...` : preview
  }

  const record = asRecord(value)

  if (record) {
    const displayKeys = [
      'label',
      'displayName',
      'name',
      'title',
      'subject',
      'number',
      'code',
      'handle',
    ]

    for (const displayKey of displayKeys) {
      const displayValue = record[displayKey]

      if (
        typeof displayValue === 'string' ||
        typeof displayValue === 'number' ||
        typeof displayValue === 'boolean'
      ) {
        return formatToolActionPreviewValue(displayValue)
      }
    }
  }

  const text = JSON.stringify(value)
  return text && text.length > 120 ? `${text.slice(0, 117)}...` : (text ?? 'leer')
}

function formatToolActionTechnicalDetails(action: AiChatToolActionItem) {
  const payload = {
    tool: `${action.serverName}.${action.toolName}`,
    status: action.status,
    arguments: action.arguments ?? {},
    result: action.resultPayload ?? null,
    error: action.errorPayload ?? null,
  }
  const text = JSON.stringify(payload, null, 2)
  return text.length > 6000 ? `${text.slice(0, 5997)}...` : text
}

function getCloseButtonLabel() {
  return te('global.close') ? t('global.close') : 'Schließen'
}

function getToolActionError(action: AiChatToolActionItem) {
  if (action.status === 'pending' && !action.handle) {
    return te('aiChat.toolActionMissingHandle')
      ? t('aiChat.toolActionMissingHandle')
      : 'Diese vorbereitete Aktion kann nicht bestaetigt werden, weil die technische Bestaetigungsnummer fehlt.'
  }

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

function getToolActionNavigationLinks(action: AiChatToolActionItem): ChatNavigationLink[] {
  if (action.status !== 'executed') {
    return []
  }

  if (action.toolName !== 'generic_create' && action.toolName !== 'generic_update') {
    return []
  }

  const entityHandle =
    extractEntityHandle(action.arguments) ?? extractEntityHandle(action.resultPayload)
  const recordHandle =
    extractResultRecordHandle(action.resultPayload) ??
    extractHandleValue(asRecord(action.arguments)?.handle)

  if (!entityHandle || recordHandle == null) {
    return []
  }

  return [
    {
      path: buildEntityTablePath(entityHandle, { handle: recordHandle }),
      entityHandle,
      kind: 'record',
      intent: 'mutationResult',
      resultCount: 1,
      recordHandles: [recordHandle],
      toolName: action.toolName,
      isPrimary: true,
    },
  ]
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
    const link = lastMessage ? getPrimaryRouteNavigationLink(lastMessage) : null

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
  if (getMessageToolActions(message).some((action) => action.status === 'pending')) {
    return []
  }

  const responsePayload =
    message.responsePayload && typeof message.responsePayload === 'object'
      ? (message.responsePayload as Record<string, unknown>)
      : null

  const navigationLinks = responsePayload?.navigationLinks

  if (!Array.isArray(navigationLinks)) {
    return []
  }

  return navigationLinks.filter(isChatNavigationLink).filter(isVisibleNavigationLink).slice(0, 3)
}

function getPrimaryRouteNavigationLink(message: AiChatMessageItem): ChatNavigationLink | null {
  return (
    getMessageNavigationLinks(message).find(
      (link) => link.kind === 'route' && link.isPrimary !== false,
    ) ?? null
  )
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

function isVisibleNavigationLink(link: ChatNavigationLink) {
  if (link.intent === 'none') {
    return false
  }

  if ((link.kind === 'list' || link.kind === 'record') && link.resultCount === 0) {
    return false
  }

  return !!link.path.trim()
}

function getNavigationLinkLabel(link: ChatNavigationLink) {
  if (link.kind === 'record' || link.kind === 'list') {
    return buildEntityNavigationLabel(link)
  }

  if (typeof link.label === 'string' && link.label.trim()) {
    return link.label.trim()
  }

  if (link.kind === 'route') {
    return te('aiChat.openRouteLink') ? t('aiChat.openRouteLink') : t('aiChat.openDataLink')
  }

  if (link.kind === 'record') {
    return te('aiChat.openRecordLink') ? t('aiChat.openRecordLink') : t('aiChat.openDataLink')
  }

  return t('aiChat.openDataLink')
}

function buildEntityNavigationLabel(link: ChatNavigationLink) {
  const count =
    typeof link.resultCount === 'number' && Number.isFinite(link.resultCount)
      ? Math.max(1, Math.trunc(link.resultCount))
      : Math.max(1, link.recordHandles?.length ?? 1)
  const entityLabel = getNavigationEntityLabel(link.entityHandle, count)

  if (count === 1) {
    return `${entityLabel} öffnen`
  }

  return `${count} ${entityLabel} öffnen`
}

function getNavigationEntityLabel(entityHandle: string, count: number) {
  const navigationKey = `navigation.${entityHandle}`
  const translated = te(navigationKey) ? String(t(navigationKey)).trim() : ''
  const label = translated || humanizeEntityHandle(entityHandle)

  return count === 1 ? singularizeEntityLabel(label) : label
}

function singularizeEntityLabel(label: string) {
  const trimmedLabel = label.trim()

  if (trimmedLabel.length > 3 && trimmedLabel.endsWith('s')) {
    return trimmedLabel.slice(0, -1)
  }

  return trimmedLabel
}

function humanizeEntityHandle(entityHandle: string) {
  const spaced = entityHandle.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function buildEntityTablePath(entityHandle: string, filter: Record<string, unknown>) {
  return `/table/${entityHandle}?filter=${encodeURIComponent(JSON.stringify(filter))}`
}

function extractEntityHandle(value: unknown): string | null {
  const record = asRecord(value)
  const directValue = record?.entityHandle

  if (typeof directValue === 'string' && directValue.trim()) {
    return directValue.trim()
  }

  const args = asRecord(record?.arguments)
  const argumentValue = args?.entityHandle

  return typeof argumentValue === 'string' && argumentValue.trim() ? argumentValue.trim() : null
}

function extractResultRecordHandle(value: unknown): string | number | null {
  const record = asRecord(value)

  if (!record) {
    return null
  }

  return (
    extractHandleValue(record?.handle) ??
    extractHandleValue(asRecord(record?.record)?.handle) ??
    extractResultRecordHandle(record?.rawResult) ??
    extractResultRecordHandle(record?.modelResult)
  )
}

function extractHandleValue(value: unknown): string | number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

async function openNavigationLink(path: string) {
  await router.push(path)
  emit('close')
}
</script>
