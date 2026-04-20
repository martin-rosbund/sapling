<template>
  <section
    class="sapling-document-detail-fullheight sapling-file-preview-fullheight sapling-fill-shell"
  >
    <div v-if="isLoading" class="sapling-file-stage glass-panel">
      <v-skeleton-loader class="sapling-file-stage__skeleton" type="image, article" />
    </div>

    <div v-else-if="!hasSelection" class="sapling-file-stage sapling-file-stage--empty glass-panel">
      <div class="sapling-file-stage__empty-state">
        <div class="sapling-file-stage__empty-icon">
          <v-icon icon="mdi-file-search-outline" size="34" />
        </div>
        <h3 class="sapling-file-stage__empty-title">{{ $t('document.preview') }}</h3>
        <p class="sapling-file-stage__empty-copy">{{ $t('global.noData') }}</p>
      </div>
    </div>

    <div v-else class="sapling-file-stage glass-panel">
      <component :is="previewComponent" v-bind="previewProps" />
    </div>
  </section>
</template>

<script lang="ts" setup>
defineProps<{
  selectedHandle: string
  hasSelection: boolean
  isLoading: boolean
  previewComponent: unknown
  previewProps: Record<string, unknown>
}>()
</script>

<style scoped src="@/assets/styles/SaplingFileDetail.css"></style>
