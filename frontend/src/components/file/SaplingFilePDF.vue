<template>
  <div class="sapling-file-preview sapling-file-pdf sapling-file-preview-fullheight" style="height: calc(100dvh - 140px); min-height: calc(100dvh - 140px);">
    <iframe
      :src="pdfUrl"
      width="100%"
      height="100%"
      style="height: 100%; min-height: 0; display: block;"
      frameborder="0"
      allowfullscreen
    ></iframe>
  </div>
</template>

<script lang="ts" setup>
defineProps<{ pdfUrl: string }>();
</script>

<style scoped>
.sapling-file-pdf {
  width: 100%;
  height: calc(100dvh - 140px);
  min-height: calc(100dvh - 140px);
  display: flex;
  flex-direction: column;
}
.sapling-file-preview-fullheight {
  flex: 1 1 0;
  min-height: 0;
  height: calc(100dvh - 140px);
  display: flex;
}
</style>
