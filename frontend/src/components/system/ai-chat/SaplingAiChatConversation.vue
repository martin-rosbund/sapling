<template>
  <section class="sapling-min-size-0 sapling-chat-conversation sapling-ai-chat__conversation">
    <div class="sapling-chat-conversation__header sapling-ai-chat__conversation-header">
      <SaplingAiChatConversationTitle
        :title="activeConversationTitle"
        :title-preview-limit="titlePreviewLimit"
      />
    </div>

    <SaplingAiChatMessageList
      :messages="messages"
      :has-configured-providers="hasConfiguredProviders"
      :has-more-messages="hasMoreMessages"
      :is-loading-older-messages="isLoadingOlderMessages"
      :is-voice-output-available="isVoiceOutputAvailable"
      :assistant-name="assistantName"
      :current-person-display-name="currentPersonDisplayName"
      :streaming-duration-by-handle="streamingDurationByHandle"
      :speech-state-by-handle="speechStateByHandle"
      @close="emit('close')"
      @load-older-messages="emit('load-older-messages')"
      @toggle-message-speech="emit('toggle-message-speech', $event)"
    />

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
        <div class="d-flex ga-2 sapling-ai-chat__composer-action-buttons">
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
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SaplingAiChatConversationTitle from '@/components/system/ai-chat/SaplingAiChatConversationTitle.vue'
import SaplingAiChatMessageList from '@/components/system/ai-chat/SaplingAiChatMessageList.vue'
import type { AiChatMessageItem } from '@/entity/entity'

const props = withDefaults(
  defineProps<{
    activeConversationTitle: string
    hasConfiguredProviders: boolean
    hasConfiguredTranscriptionProviders: boolean
    canSendMessage: boolean
    isSending: boolean
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
  (event: 'update:draftMessage', value: string): void
  (event: 'send'): void
  (event: 'close'): void
  (event: 'load-older-messages'): void
  (event: 'toggle-message-speech', message: AiChatMessageItem): void
  (event: 'toggle-voice-input'): void
}>()

const { t } = useI18n()

const draftMessageModel = computed({
  get: () => props.draftMessage,
  set: (value: string) => emit('update:draftMessage', value),
})

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
</script>
