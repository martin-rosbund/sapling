<template>
  <div class="sapling-document-detail-fullheight d-flex flex-column">
    <div class="sapling-document-detail-scroll">
      <v-btn
        :disabled="!selectedHandle"
        class="sapling-document-download-btn glass-panel mt-3"
        @click="onDownloadDocument"
        block text
      >
        Download
      </v-btn>
      <div class="sapling-document-preview-wrapper mt-4">
        <component
          :is="previewComponent"
          v-if="selectedHandle"
          v-bind="previewProps"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  selectedHandle: string;
  onDownloadDocument: () => void;
  previewComponent: unknown;
  previewProps: Record<string, unknown>;
}>();
</script>

<style scoped>
.sapling-document-detail-fullheight {
  height: calc(100dvh - 140px);
  min-height: calc(100dvh - 140px);
  display: flex;
  flex-direction: column;
}
</style>