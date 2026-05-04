<template>
  <div
    class="sapling-file-preview sapling-file-video sapling-file-viewer sapling-file-preview-fullheight"
  >
    <div class="sapling-file-media-surface">
      <video class="sapling-file-video-player" controls preload="metadata">
        <source :src="videoUrl" :type="mimeType || undefined" />
        {{ fileName || $t('document.noPreviewAvailable') }}
      </video>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  videoUrl: string
  mimeType?: string
  fileName?: string
}>()
</script>
