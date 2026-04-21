<template>
  <div
    class="sapling-file-preview sapling-file-jpeg sapling-file-viewer sapling-file-preview-fullheight"
  >
    <div class="sapling-file-media-surface">
      <img :src="jpegUrl" alt="JPEG Vorschau" class="sapling-file-media" />
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{ jpegUrl: string }>()
</script>
