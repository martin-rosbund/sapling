<template>
  <div class="sapling-file-preview sapling-file-no-preview sapling-file-viewer sapling-file-preview-fullheight d-flex align-center justify-center">
    <div class="sapling-no-preview-content d-flex align-center justify-center transparent">
      <v-icon class="mr-2" size="28">mdi-eye-off-outline</v-icon>
      <span>{{ $t('document.noPreviewAvailable') }}</span>
    </div>
  </div>
</template>

<style scoped src="@/assets/styles/SaplingFile.css"></style>
