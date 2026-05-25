<template>
  <div
    class="sapling-file-preview sapling-file-no-preview sapling-file-viewer sapling-file-preview-fullheight"
  >
    <div
      class="sapling-empty-state-panel sapling-file-stage__empty-state sapling-file-stage__empty-state--compact"
    >
      <div class="sapling-empty-state-panel__icon sapling-file-stage__empty-icon">
        <v-icon icon="mdi-eye-off-outline" size="34" />
      </div>
      <h3 class="sapling-empty-state-panel__title sapling-file-stage__empty-title">
        {{ $t('document.noPreviewAvailable') }}
      </h3>
      <p class="sapling-empty-state-panel__text sapling-file-stage__empty-copy">
        {{ $t('document.downloadToInspect') }}
      </p>
    </div>
  </div>
</template>
