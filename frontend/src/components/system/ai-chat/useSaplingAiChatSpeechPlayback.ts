import { computed, ref, type Ref } from 'vue'
import type { AiChatMessageItem, AiChatSessionItem, AiProviderModelItem } from '@/entity/entity'
import ApiAiService from '@/services/api.ai.service'
import {
  doesSpeechMetadataMatchSelection,
  getMessageSpeechMetadata,
} from '@/components/system/ai-chat/aiChatSpeechMetadata'

interface UseSaplingAiChatSpeechPlaybackOptions {
  isOpen: Ref<boolean>
  isVoiceOutputAvailable: Ref<boolean>
  activeSession: Ref<AiChatSessionItem | null>
  messages: Ref<AiChatMessageItem[]>
  selectedSpeechProviderHandle: Ref<string | null>
  selectedSpeechModelHandle: Ref<string | null>
  speechModelConfigs: Ref<AiProviderModelItem[]>
  upsertMessage: (message: AiChatMessageItem) => void
  reportPlaybackError: () => void
}

export function useSaplingAiChatSpeechPlayback({
  isOpen,
  isVoiceOutputAvailable,
  activeSession,
  messages,
  selectedSpeechProviderHandle,
  selectedSpeechModelHandle,
  speechModelConfigs,
  upsertMessage,
  reportPlaybackError,
}: UseSaplingAiChatSpeechPlaybackOptions) {
  const activeSpeechAudio = ref<HTMLAudioElement | null>(null)
  const activeSpeechMessageHandle = ref<number | null>(null)
  const speechLoadingByHandle = ref<Record<number, boolean>>({})
  const speechFailedByHandle = ref<Record<number, boolean>>({})
  const pendingSpeechRequestByHandle = new Map<number, Promise<AiChatMessageItem>>()
  const speechObjectUrlByDocumentHandle = new Map<number, string>()
  const autoRequestedSpeechHandles = new Set<number>()

  const speechStateByHandle = computed<Record<number, string>>(() => {
    const nextState: Record<number, string> = {}

    for (const message of messages.value) {
      if (
        message.handle == null ||
        message.role !== 'assistant' ||
        message.status !== 'completed' ||
        !message.content?.trim()
      ) {
        continue
      }

      if (activeSpeechMessageHandle.value === message.handle) {
        nextState[message.handle] = 'playing'
        continue
      }

      if (speechLoadingByHandle.value[message.handle]) {
        nextState[message.handle] = 'loading'
        continue
      }

      const speech = getMessageSpeechMetadata(message)

      if (speech?.status === 'completed' && speech.documentHandle != null) {
        nextState[message.handle] = 'ready'
        continue
      }

      if (speech?.status === 'failed' || speechFailedByHandle.value[message.handle]) {
        nextState[message.handle] = 'failed'
        continue
      }

      nextState[message.handle] = 'idle'
    }

    return nextState
  })

  function getSelectedSpeechModelConfig() {
    return (
      speechModelConfigs.value.find((item) => item.handle === selectedSpeechModelHandle.value) ??
      null
    )
  }

  async function autoPlayAssistantSpeech(message: AiChatMessageItem) {
    const sessionHandle =
      typeof message.session === 'number' ? message.session : (message.session?.handle ?? null)

    if (
      !isOpen.value ||
      !isVoiceOutputAvailable.value ||
      message.handle == null ||
      !message.content?.trim() ||
      (sessionHandle != null && activeSession.value?.handle !== sessionHandle)
    ) {
      return
    }

    if (autoRequestedSpeechHandles.has(message.handle)) {
      return
    }

    autoRequestedSpeechHandles.add(message.handle)

    try {
      const updatedMessage =
        (await ensureMessageSpeech(message, { reportErrors: false })) ?? message

      if (
        !isOpen.value ||
        (sessionHandle != null && activeSession.value?.handle !== sessionHandle)
      ) {
        return
      }

      await playMessageSpeech(updatedMessage, { reportErrors: false })
    } catch {
      // Autoplay stays silent; manual playback can retry later.
    }
  }

  async function toggleMessageSpeech(message: AiChatMessageItem) {
    if (message.handle == null) {
      return
    }

    if (activeSpeechMessageHandle.value === message.handle) {
      stopSpeechPlayback()
      return
    }

    const updatedMessage = (await ensureMessageSpeech(message, { reportErrors: true })) ?? message
    await playMessageSpeech(updatedMessage, { reportErrors: true })
  }

  async function ensureMessageSpeech(
    message: AiChatMessageItem,
    options?: {
      reportErrors?: boolean
    },
  ) {
    if (
      message.handle == null ||
      message.role !== 'assistant' ||
      message.status !== 'completed' ||
      !message.content?.trim()
    ) {
      return null
    }

    const existingSpeech = getMessageSpeechMetadata(message)

    if (
      doesSpeechMetadataMatchSelection(
        existingSpeech,
        getSelectedSpeechModelConfig(),
        selectedSpeechProviderHandle.value,
      )
    ) {
      return message
    }

    const pendingRequest = pendingSpeechRequestByHandle.get(message.handle)

    if (pendingRequest) {
      return pendingRequest
    }

    speechLoadingByHandle.value = {
      ...speechLoadingByHandle.value,
      [message.handle]: true,
    }
    speechFailedByHandle.value = {
      ...speechFailedByHandle.value,
      [message.handle]: false,
    }

    const request = ApiAiService.ensureMessageSpeech(
      message.handle,
      {
        providerHandle: selectedSpeechProviderHandle.value ?? undefined,
        modelHandle: selectedSpeechModelHandle.value ?? undefined,
      },
      {
        suppressErrorMessage: !options?.reportErrors,
      },
    )
      .then((updatedMessage) => {
        upsertMessage(updatedMessage)
        return updatedMessage
      })
      .catch((error) => {
        speechFailedByHandle.value = {
          ...speechFailedByHandle.value,
          [message.handle as number]: true,
        }
        throw error
      })
      .finally(() => {
        pendingSpeechRequestByHandle.delete(message.handle as number)
        speechLoadingByHandle.value = {
          ...speechLoadingByHandle.value,
          [message.handle as number]: false,
        }
      })

    pendingSpeechRequestByHandle.set(message.handle, request)
    return request
  }

  async function playMessageSpeech(
    message: AiChatMessageItem,
    options?: {
      reportErrors?: boolean
    },
  ) {
    const speech = getMessageSpeechMetadata(message)

    if (message.handle == null || speech?.documentHandle == null) {
      return
    }

    stopSpeechPlayback()

    let objectUrl = speechObjectUrlByDocumentHandle.get(speech.documentHandle)

    if (!objectUrl) {
      const blob = await ApiAiService.downloadMessageSpeechAudio(speech.documentHandle, {
        suppressErrorMessage: !options?.reportErrors,
      })
      objectUrl = URL.createObjectURL(blob)
      speechObjectUrlByDocumentHandle.set(speech.documentHandle, objectUrl)
    }

    const audio = new Audio(objectUrl)
    activeSpeechAudio.value = audio
    activeSpeechMessageHandle.value = message.handle

    audio.addEventListener('ended', () => {
      if (activeSpeechAudio.value !== audio) {
        return
      }

      activeSpeechAudio.value = null
      activeSpeechMessageHandle.value = null
    })

    audio.addEventListener('error', () => {
      if (activeSpeechAudio.value === audio) {
        activeSpeechAudio.value = null
        activeSpeechMessageHandle.value = null
      }
    })

    try {
      await audio.play()
    } catch (error) {
      if (activeSpeechAudio.value === audio) {
        activeSpeechAudio.value = null
        activeSpeechMessageHandle.value = null
      }

      if (options?.reportErrors) {
        reportPlaybackError()
      }

      throw error
    }
  }

  function stopSpeechPlayback() {
    const audio = activeSpeechAudio.value

    activeSpeechAudio.value = null
    activeSpeechMessageHandle.value = null

    if (!audio) {
      return
    }

    audio.pause()
    audio.currentTime = 0
    audio.src = ''
  }

  function revokeSpeechObjectUrls() {
    for (const objectUrl of speechObjectUrlByDocumentHandle.values()) {
      URL.revokeObjectURL(objectUrl)
    }

    speechObjectUrlByDocumentHandle.clear()
  }

  return {
    speechStateByHandle,
    autoPlayAssistantSpeech,
    toggleMessageSpeech,
    stopSpeechPlayback,
    revokeSpeechObjectUrls,
  }
}
