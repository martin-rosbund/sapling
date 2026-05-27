<template>
  <section class="sapling-min-size-0 sapling-chat-conversation sapling-ai-chat__conversation">
    <div class="sapling-chat-conversation__header sapling-ai-chat__conversation-header">
      <SaplingAiChatConversationTitle
        :title="activeConversationTitle"
        :title-preview-limit="titlePreviewLimit"
      />
      <SaplingAiChatRuntimeSelectors
        :provider-options="providerOptions"
        :model-options="modelOptions"
        :selected-provider-handle="selectedProviderHandle"
        :selected-model-handle="selectedModelHandle"
        :has-configured-providers="hasConfiguredProviders"
        :is-sending="isSending"
        :is-loading-providers="isLoadingProviders"
        :is-loading-models="isLoadingModels"
        @update:selected-provider="emit('update:selectedProvider', $event)"
        @update:selected-model="emit('update:selectedModel', $event)"
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
        <SaplingAiChatVoiceSelectors
          :transcription-provider-options="transcriptionProviderOptions"
          :transcription-model-options="transcriptionModelOptions"
          :speech-provider-options="speechProviderOptions"
          :speech-model-options="speechModelOptions"
          :selected-transcription-provider-handle="selectedTranscriptionProviderHandle"
          :selected-transcription-model-handle="selectedTranscriptionModelHandle"
          :selected-speech-provider-handle="selectedSpeechProviderHandle"
          :selected-speech-model-handle="selectedSpeechModelHandle"
          :has-configured-speech-providers="hasConfiguredSpeechProviders"
          :is-sending="isSending"
          :is-loading-transcription-providers="isLoadingTranscriptionProviders"
          :is-loading-transcription-models="isLoadingTranscriptionModels"
          :is-loading-speech-providers="isLoadingSpeechProviders"
          :is-loading-speech-models="isLoadingSpeechModels"
          @update:selected-transcription-provider="
            emit('update:selectedTranscriptionProvider', $event)
          "
          @update:selected-transcription-model="emit('update:selectedTranscriptionModel', $event)"
          @update:selected-speech-provider="emit('update:selectedSpeechProvider', $event)"
          @update:selected-speech-model="emit('update:selectedSpeechModel', $event)"
        />
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
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SaplingAiChatConversationTitle from '@/components/system/ai-chat/SaplingAiChatConversationTitle.vue'
import SaplingAiChatMessageList from '@/components/system/ai-chat/SaplingAiChatMessageList.vue'
import SaplingAiChatRuntimeSelectors from '@/components/system/ai-chat/SaplingAiChatRuntimeSelectors.vue'
import SaplingAiChatVoiceSelectors from '@/components/system/ai-chat/SaplingAiChatVoiceSelectors.vue'
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
