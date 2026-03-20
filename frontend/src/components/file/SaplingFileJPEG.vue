<template>
  <div class="sapling-file-preview sapling-file-jpeg">
    <img :src="jpegUrl" alt="JPEG Vorschau" style="max-width:100%; max-height:calc(100dvh - 140px);" />
  </div>
</template>

<script lang="ts" setup>
defineProps<{ jpegUrl: string }>();
</script>

<style scoped>
.sapling-file-jpeg {
  width: 100%;
  min-height: calc(100dvh - 140px);
}
</style>
