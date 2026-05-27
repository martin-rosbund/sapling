<template>
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
          :disabled="isSending || isLoadingTranscriptionProviders || isLoadingTranscriptionModels"
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
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

type SelectOption = {
  label: string
  value: string
}

defineProps<{
  transcriptionProviderOptions: SelectOption[]
  transcriptionModelOptions: SelectOption[]
  speechProviderOptions: SelectOption[]
  speechModelOptions: SelectOption[]
  selectedTranscriptionProviderHandle: string | null
  selectedTranscriptionModelHandle: string | null
  selectedSpeechProviderHandle: string | null
  selectedSpeechModelHandle: string | null
  hasConfiguredSpeechProviders: boolean
  isSending: boolean
  isLoadingTranscriptionProviders: boolean
  isLoadingTranscriptionModels: boolean
  isLoadingSpeechProviders: boolean
  isLoadingSpeechModels: boolean
}>()

const emit = defineEmits<{
  (event: 'update:selectedTranscriptionProvider', value: unknown): void
  (event: 'update:selectedTranscriptionModel', value: unknown): void
  (event: 'update:selectedSpeechProvider', value: unknown): void
  (event: 'update:selectedSpeechModel', value: unknown): void
}>()

const { t } = useI18n()
</script>
