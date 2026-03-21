<template>
  <div class="sapling-file-preview sapling-file-png sapling-file-preview-fullheight">
    <img :src="pngUrl" alt="Bildvorschau" style="max-width:100%; max-height:100%; object-fit:contain; display:block; margin:auto;" />
  </div>
</template>

<script lang="ts" setup>
defineProps<{ pngUrl: string }>();
</script>

<style scoped>
.sapling-file-png {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.sapling-file-preview-fullheight {
  flex: 1 1 0;
  min-height: 0;
  height: 100%;
  display: flex;
}
</style>
