<template>
  <div
    class="sapling-file-preview sapling-file-pdf sapling-file-viewer sapling-file-preview-fullheight"
  >
    <iframe :src="pdfUrl" class="sapling-file-embed" frameborder="0" allowfullscreen></iframe>
  </div>
</template>

<script lang="ts" setup>
defineProps<{ pdfUrl: string }>()
</script>

<style scoped src="@/assets/styles/SaplingFile.css"></style>
