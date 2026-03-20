<template>
  <div class="sapling-file-preview sapling-file-png">
    <img :src="pngUrl" alt="Bildvorschau" style="max-width:100%; max-height:calc(100dvh - 140px);" />
  </div>
</template>

<script lang="ts" setup>
defineProps<{ pngUrl: string }>();
</script>

<style scoped>
.sapling-file-png {
  width: 100%;
  min-height: calc(100dvh - 140px);
}
</style>
