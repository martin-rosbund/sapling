<template>
  <div
    class="sapling-file-preview sapling-file-png sapling-preview-viewer sapling-file-viewer sapling-preview-fullheight sapling-file-preview-fullheight"
  >
    <div class="sapling-preview-media-surface sapling-file-media-surface">
      <img :src="pngUrl" :alt="$t('document.preview')" class="sapling-preview-media sapling-file-media" />
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{ pngUrl: string }>()
</script>
