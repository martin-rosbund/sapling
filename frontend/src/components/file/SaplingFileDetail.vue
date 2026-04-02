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

<style scoped src="@/assets/styles/SaplingFileDetail.css"></style>