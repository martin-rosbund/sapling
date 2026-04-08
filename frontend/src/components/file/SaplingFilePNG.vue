<template>
  <div class="sapling-file-preview sapling-file-png sapling-file-viewer sapling-file-preview-fullheight">
    <div class="sapling-file-media-surface">
      <img :src="pngUrl" alt="Bildvorschau" class="sapling-file-media" />
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{ pngUrl: string }>();
</script>

<style scoped src="@/assets/styles/SaplingFile.css"></style>
