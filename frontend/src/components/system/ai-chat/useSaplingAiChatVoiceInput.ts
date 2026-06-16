import { computed, nextTick, ref, type Ref } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import type { AiChatSessionItem } from '@/entity/entity'
import ApiAiService from '@/services/api.ai.service'

const VOICE_INPUT_SILENCE_THRESHOLD = 0.02
const VOICE_INPUT_SILENCE_STOP_DELAY_MS = 1600
const VOICE_INPUT_SILENCE_MONITOR_INTERVAL_MS = 200
const VOICE_INPUT_INITIAL_GRACE_PERIOD_MS = 2500

interface SaplingAiChatVoiceInputOptions {
  activeSession: Ref<AiChatSessionItem | null>
  draftMessage: Ref<string>
  selectedTranscriptionProviderHandle: Ref<string | null>
  selectedTranscriptionModelHandle: Ref<string | null>
  hasConfiguredProviders: Ref<boolean>
  hasConfiguredTranscriptionProviders: Ref<boolean>
  route: RouteLocationNormalizedLoaded
  sendMessage: () => Promise<void> | void
  pushMessage: (
    type: 'error' | 'info' | 'success' | 'warning',
    message: string,
    description: string,
    channel: string,
  ) => void
}

export function useSaplingAiChatVoiceInput({
  activeSession,
  draftMessage,
  selectedTranscriptionProviderHandle,
  selectedTranscriptionModelHandle,
  hasConfiguredProviders,
  hasConfiguredTranscriptionProviders,
  route,
  sendMessage,
  pushMessage,
}: SaplingAiChatVoiceInputOptions) {
  const isRecordingVoiceInput = ref(false)
  const isTranscribingVoiceInput = ref(false)
  const activeTranscriptionHandle = ref<number | null>(null)
  const activeVoiceRecorder = ref<MediaRecorder | null>(null)
  const activeVoiceStream = ref<MediaStream | null>(null)
  const activeVoiceAudioContext = ref<AudioContext | null>(null)
  const activeVoiceAnalyser = ref<AnalyserNode | null>(null)
  const activeVoiceSourceNode = ref<MediaStreamAudioSourceNode | null>(null)

  let voiceRecordingStartedAt: number | null = null
  let pendingVoiceChunks: Blob[] = []
  let discardPendingVoiceRecording = false
  let voiceInputSilenceMonitorTimer: number | null = null
  let lastDetectedVoiceActivityAt: number | null = null

  const isVoiceInputAvailable = computed(
    () =>
      typeof window !== 'undefined' &&
      typeof MediaRecorder !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      hasConfiguredTranscriptionProviders.value,
  )

  async function toggleVoiceInput() {
    if (isTranscribingVoiceInput.value) {
      return
    }

    if (isRecordingVoiceInput.value) {
      stopVoiceInput()
      return
    }

    if (!isVoiceInputAvailable.value) {
      pushMessage('info', 'aiChat.voiceInputUnavailable', '', 'aiChat')
      return
    }

    if (!hasConfiguredProviders.value) {
      pushMessage('info', 'aiChat.noConfiguredProviders', 'aiChat.contactAdministrator', 'aiChat')
      return
    }

    if (!hasConfiguredTranscriptionProviders.value) {
      pushMessage(
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
      pushMessage(
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
        pushMessage('info', 'aiChat.noSpeechDetected', '', 'aiChat')
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

  return {
    isRecordingVoiceInput,
    isTranscribingVoiceInput,
    isVoiceInputAvailable,
    activeTranscriptionHandle,
    toggleVoiceInput,
    cancelVoiceInput,
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
