<template>
  <div class="sapling-file-preview sapling-file-pdf sapling-file-preview-fullheight">
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

<style scoped src="@/assets/styles/SaplingFilePDF.css"></style>
