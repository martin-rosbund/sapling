<template>
  <div
    class="sapling-file-preview sapling-file-pdf sapling-preview-viewer sapling-file-viewer sapling-preview-fullheight sapling-file-preview-fullheight"
  >
    <iframe :src="pdfUrl" class="sapling-preview-embed sapling-file-embed" frameborder="0" allowfullscreen></iframe>
  </div>
</template>

<script lang="ts" setup>
defineProps<{ pdfUrl: string }>()
</script>
