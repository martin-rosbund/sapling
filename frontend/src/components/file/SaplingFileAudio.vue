<template>
  <div
    class="sapling-file-preview sapling-file-audio sapling-file-viewer sapling-file-preview-fullheight"
  >
    <div class="sapling-file-media-surface sapling-file-media-surface--stacked">
      <div class="sapling-file-media-card sapling-file-media-card--minimal">
        <div class="sapling-file-media-card__header">
          <div class="sapling-file-media-card__icon">
            <v-icon icon="mdi-music-circle-outline" size="44" />
          </div>

          <div class="sapling-file-media-card__copy">
            <div class="sapling-file-media-card__eyebrow-row">
              <span class="sapling-file-media-card__pill">{{ formatLabel }}</span>
              <span class="sapling-file-media-card__meta">{{ mimeType || 'audio/mpeg' }}</span>
            </div>
          </div>
        </div>

        <div class="sapling-file-audio-player-shell">
          <audio class="sapling-file-audio-player" controls preload="metadata">
            <source :src="audioUrl" :type="mimeType || 'audio/mpeg'" />
          </audio>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

const props = defineProps<{
  audioUrl: string
  mimeType?: string
  fileName?: string
}>()

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
