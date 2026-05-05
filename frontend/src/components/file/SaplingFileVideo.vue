<template>
  <div
    class="sapling-file-preview sapling-file-video sapling-file-viewer sapling-file-preview-fullheight"
  >
    <div class="sapling-file-media-surface">
      <video
        ref="videoElement"
        :key="videoUrl"
        class="sapling-file-video-player"
        controls
        preload="metadata"
      >
        <source :src="videoUrl" :type="mimeType || undefined" />
        {{ fileName || $t('document.noPreviewAvailable') }}
      </video>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  videoUrl: string
  mimeType?: string
  fileName?: string
}>()

const videoElement = ref<HTMLVideoElement | null>(null)

function resetVideoPlayback() {
  const element = videoElement.value
  if (element == null) return

  element.pause()
  element.currentTime = 0
  element.load()
}

watch(
  () => props.videoUrl,
  async (nextUrl, previousUrl) => {
    if (!nextUrl || nextUrl === previousUrl) return
    await nextTick()
    resetVideoPlayback()
  },
)

onBeforeUnmount(() => {
  resetVideoPlayback()
})
</script>
