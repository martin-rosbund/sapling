<template>
  <div
    class="sapling-file-preview sapling-file-no-preview sapling-preview-viewer sapling-file-viewer sapling-preview-fullheight sapling-file-preview-fullheight"
  >
    <div
      class="sapling-empty-state-panel sapling-preview-stage__empty-state sapling-preview-stage__empty-state--wide sapling-file-stage__empty-state sapling-file-stage__empty-state--compact"
    >
      <div
        class="sapling-empty-state-panel__icon sapling-preview-stage__empty-icon sapling-file-stage__empty-icon"
      >
        <v-icon icon="mdi-eye-off-outline" size="34" />
      </div>
      <h3
        class="sapling-empty-state-panel__title sapling-preview-stage__empty-title sapling-file-stage__empty-title"
      >
        {{ $t('document.noPreviewAvailable') }}
      </h3>
      <p
        class="sapling-empty-state-panel__text sapling-preview-stage__empty-copy sapling-file-stage__empty-copy"
      >
        {{ $t('document.downloadToInspect') }}
      </p>
    </div>
  </div>
</template>
