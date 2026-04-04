<template>
  <div class="sapling-file-preview sapling-file-jpeg sapling-file-viewer sapling-file-preview-fullheight">
    <img :src="jpegUrl" alt="JPEG Vorschau" style="max-width:100%; max-height:100%; object-fit:contain; display:block; margin:auto;" />
  </div>
</template>

<script lang="ts" setup>
defineProps<{ jpegUrl: string }>();
</script>

<style scoped src="@/assets/styles/SaplingFile.css"></style>
