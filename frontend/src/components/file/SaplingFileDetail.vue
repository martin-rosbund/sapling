<template>
  <div class="sapling-document-detail-fullheight sapling-file-preview-fullheight d-flex flex-column">
    <component
      :is="previewComponent"
      v-bind="previewProps"
    />
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
  min-height: calc(100dvh - 140px);
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 24px 0 rgba(0,0,0,0.10), 0 1.5px 6px 0 rgba(0,0,0,0.08);
}
.sapling-file-preview-fullheight {
  flex: 1 1 0;
  min-height: 0;
  height: 100%;
  display: flex;
}

</style>