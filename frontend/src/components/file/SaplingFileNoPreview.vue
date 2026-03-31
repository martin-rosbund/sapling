<template>
  <div class="sapling-file-preview sapling-file-no-preview sapling-file-preview-fullheight d-flex align-center justify-center">
    <div class="sapling-no-preview-content d-flex align-center justify-center transparent">
      <v-icon class="mr-2" size="28">mdi-eye-off-outline</v-icon>
      <span>{{ $t('document.noPreviewAvailable') }}</span>
    </div>
  </div>
</template>

<style scoped>
.sapling-file-no-preview {
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
