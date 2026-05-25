<template>
  <div
    class="sapling-file-preview sapling-file-audio sapling-preview-viewer sapling-file-viewer sapling-preview-fullheight sapling-file-preview-fullheight"
  >
    <div class="sapling-preview-media-surface sapling-preview-media-surface--stacked sapling-file-media-surface sapling-file-media-surface--stacked">
      <div
        class="sapling-panel-shell sapling-stack-md sapling-preview-media-card sapling-preview-media-card--compact sapling-file-media-card sapling-file-media-card--minimal"
      >
        <div class="sapling-row-md sapling-preview-media-card__header sapling-file-media-card__header">
          <div class="sapling-icon-tile sapling-preview-media-card__icon sapling-file-media-card__icon">
            <v-icon icon="mdi-music-circle-outline" size="44" />
          </div>

          <div class="sapling-preview-media-card__copy sapling-file-media-card__copy">
            <div class="sapling-chip-row sapling-preview-media-card__eyebrow-row sapling-file-media-card__eyebrow-row">
              <span class="sapling-soft-chip sapling-preview-media-card__pill sapling-file-media-card__pill">{{ formatLabel }}</span>
              <span class="sapling-preview-media-card__meta sapling-file-media-card__meta">{{ mimeType || 'audio/mpeg' }}</span>
            </div>
          </div>
        </div>

        <div class="sapling-preview-player-shell sapling-file-audio-player-shell">
          <audio
            ref="audioElement"
            :key="audioUrl"
            class="sapling-preview-player sapling-file-audio-player"
            controls
            preload="metadata"
          >
            <source :src="audioUrl" :type="mimeType || 'audio/mpeg'" />
          </audio>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  audioUrl: string
  mimeType?: string
  fileName?: string
}>()

const audioElement = ref<HTMLAudioElement | null>(null)

function resetAudioPlayback() {
  const element = audioElement.value
  if (element == null) return

  element.pause()
  element.currentTime = 0
  element.load()
}

watch(
  () => props.audioUrl,
  async (nextUrl, previousUrl) => {
    if (!nextUrl || nextUrl === previousUrl) return
    await nextTick()
    resetAudioPlayback()
  },
)

onBeforeUnmount(() => {
  resetAudioPlayback()
})

const formatLabel = computed(() => {
  const normalizedFileName = (props.fileName || '').trim().toLowerCase()
  if (normalizedFileName.endsWith('.mp3')) {
    return 'MP3'
  }

  if (props.mimeType?.trim()) {
    return props.mimeType.split('/').pop()?.toUpperCase() || 'AUDIO'
  }

  return 'AUDIO'
})
</script>
