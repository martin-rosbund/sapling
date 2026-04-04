<template>
  <div class="sapling-file-preview sapling-file-png sapling-file-viewer sapling-file-preview-fullheight">
    <img :src="pngUrl" alt="Bildvorschau" style="max-width:100%; max-height:100%; object-fit:contain; display:block; margin:auto;" />
  </div>
</template>

<script lang="ts" setup>
defineProps<{ pngUrl: string }>();
</script>

<style scoped src="@/assets/styles/SaplingFile.css"></style>
