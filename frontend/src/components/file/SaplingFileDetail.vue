<template>
  <section
    class="sapling-document-detail-fullheight sapling-preview-fullheight sapling-file-preview-fullheight sapling-fill-shell"
  >
    <SaplingSurface
      v-if="isLoading"
      class="sapling-panel-shell sapling-preview-stage sapling-file-stage"
    >
      <v-skeleton-loader
        class="sapling-preview-stage__skeleton sapling-file-stage__skeleton"
        type="image, article"
      />
    </SaplingSurface>

    <SaplingSurface
      v-else-if="!hasSelection"
      class="sapling-panel-shell sapling-preview-stage sapling-preview-stage--empty sapling-file-stage sapling-file-stage--empty"
    >
      <div
        class="sapling-empty-state-panel sapling-preview-stage__empty-state sapling-file-stage__empty-state"
      >
        <div
          class="sapling-empty-state-panel__icon sapling-preview-stage__empty-icon sapling-file-stage__empty-icon"
        >
          <v-icon icon="mdi-file-search-outline" size="34" />
        </div>
        <h3
          class="sapling-empty-state-panel__title sapling-preview-stage__empty-title sapling-file-stage__empty-title"
        >
          {{ $t('document.selectFileForPreview') }}
        </h3>
        <p
          class="sapling-empty-state-panel__text sapling-preview-stage__empty-copy sapling-file-stage__empty-copy"
        >
          {{ $t('document.selectFileForPreviewDescription') }}
        </p>
      </div>
    </SaplingSurface>

    <SaplingSurface v-else class="sapling-panel-shell sapling-preview-stage sapling-file-stage">
      <component :is="previewComponent" v-bind="previewProps" />
    </SaplingSurface>
  </section>
</template>

<script lang="ts" setup>
import SaplingSurface from '@/components/common/SaplingSurface.vue'

defineProps<{
  hasSelection: boolean
  isLoading: boolean
  previewComponent: unknown
  previewProps: Record<string, unknown>
}>()
</script>
