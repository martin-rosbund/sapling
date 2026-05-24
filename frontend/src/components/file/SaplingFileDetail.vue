<template>
  <section
    class="sapling-document-detail-fullheight sapling-file-preview-fullheight sapling-fill-shell"
  >
    <SaplingSurface v-if="isLoading" class="sapling-file-stage">
      <v-skeleton-loader class="sapling-file-stage__skeleton" type="image, article" />
    </SaplingSurface>

    <SaplingSurface v-else-if="!hasSelection" class="sapling-file-stage sapling-file-stage--empty">
      <div class="sapling-file-stage__empty-state">
        <div class="sapling-file-stage__empty-icon">
          <v-icon icon="mdi-file-search-outline" size="34" />
        </div>
        <h3 class="sapling-file-stage__empty-title">{{ $t('document.selectFileForPreview') }}</h3>
        <p class="sapling-file-stage__empty-copy">
          {{ $t('document.selectFileForPreviewDescription') }}
        </p>
      </div>
    </SaplingSurface>

    <SaplingSurface v-else class="sapling-file-stage">
      <component :is="previewComponent" v-bind="previewProps" />
    </SaplingSurface>
  </section>
</template>

<script lang="ts" setup>
import '@/assets/styles/SaplingFileDetail.css'
import SaplingSurface from '@/components/common/SaplingSurface.vue'

defineProps<{
  hasSelection: boolean
  isLoading: boolean
  previewComponent: unknown
  previewProps: Record<string, unknown>
}>()
</script>
