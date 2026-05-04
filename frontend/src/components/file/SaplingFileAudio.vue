<template>
  <div
    class="sapling-file-preview sapling-file-audio sapling-file-viewer sapling-file-preview-fullheight"
  >
    <div class="sapling-file-media-surface sapling-file-media-surface--stacked">
      <div class="sapling-file-media-card">
        <div class="sapling-file-media-card__icon">
          <v-icon icon="mdi-music-circle-outline" size="44" />
        </div>
        <div class="sapling-file-media-card__copy">
          <h3 class="sapling-file-media-card__title">{{ fileName || $t('document.file') }}</h3>
          <p class="sapling-file-media-card__meta">{{ mimeType || 'audio/mpeg' }}</p>
        </div>
        <audio class="sapling-file-audio-player" controls preload="metadata">
          <source :src="audioUrl" :type="mimeType || 'audio/mpeg'" />
        </audio>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  audioUrl: string
  mimeType?: string
  fileName?: string
}>()
</script>
