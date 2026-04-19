<template>
  <section class="sapling-ai-chat__conversation">
    <div class="sapling-ai-chat__conversation-header">
      <div class="sapling-ai-chat__conversation-heading">
        <div class="sapling-ai-chat__conversation-title-row">
          <div class="sapling-ai-chat__conversation-title">
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
          @update:model-value="emit('update:selectedProvider', $event)"
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
          @update:model-value="emit('update:selectedModel', $event)"
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
        <div class="sapling-ai-chat__message-content">
          <SaplingMarkdownContent :source="getMessageDisplayContent(message)" />
        </div>
      </div>
    </div>

    <div class="sapling-ai-chat__composer">
      <v-textarea
        v-model="draftMessageModel"
        :placeholder="t('aiChat.inputPlaceholder')"
        auto-grow
        density="comfortable"
        hide-details
        rows="3"
        variant="outlined"
        @keydown.enter.exact.prevent="emit('send')"
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
        <v-btn variant="tonal" :loading="isSending" @click="emit('send')">
          {{ t('aiChat.send') }}
        </v-btn>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SaplingMarkdownContent from '@/components/common/SaplingMarkdownContent.vue'
import type { AiChatMessageItem } from '@/entity/entity'

interface SelectOption {
  label: string
  value: string
}

const props = withDefaults(
  defineProps<{
    activeConversationTitle: string
    providerOptions: SelectOption[]
    modelOptions: SelectOption[]
    selectedProviderHandle: string | null
    selectedModelHandle: string | null
    isSending: boolean
    isLoadingProviders: boolean
    isLoadingModels: boolean
    messages: AiChatMessageItem[]
    draftMessage: string
    assistantName: string
    currentPersonDisplayName: string
    streamingDurationByHandle: Record<number, number>
    titlePreviewLimit?: number
  }>(),
  {
    titlePreviewLimit: 30,
  },
)

const emit = defineEmits<{
  (event: 'update:selectedProvider', value: unknown): void
  (event: 'update:selectedModel', value: unknown): void
  (event: 'update:draftMessage', value: string): void
  (event: 'send'): void
}>()

const { t } = useI18n()
const messageContainer = ref<HTMLElement | null>(null)

const draftMessageModel = computed({
  get: () => props.draftMessage,
  set: (value: string) => emit('update:draftMessage', value),
})

watch(
  () =>
    props.messages
      .map(
        (message) =>
          `${message.handle ?? 'pending'}:${message.content?.length ?? 0}:${message.status ?? ''}`,
      )
      .join('|'),
  async () => {
    await nextTick()
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    }
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
  if (message.content?.trim()) {
    return message.content
  }

  if (message.status === 'streaming') {
    return '...'
  }

  return message.content ?? ''
}

function getStreamingStatusLabel(message: AiChatMessageItem) {
  const seconds =
    message.handle == null ? 0 : (props.streamingDurationByHandle[message.handle] ?? 0)
  return `... ${seconds}s`
}
</script>
