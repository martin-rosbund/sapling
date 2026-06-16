<template>
  <v-alert
    v-if="isRunning"
    type="info"
    variant="tonal"
    density="comfortable"
    class="sapling-import__job-status"
  >
    <div class="sapling-import__job-status-content">
      <div class="sapling-import__job-status-header">
        <strong>{{ statusLabel }}</strong>
        <span>{{ progressLabel }}</span>
      </div>
      <v-progress-linear
        class="sapling-import__job-progress"
        :model-value="progressPercent"
        height="8"
        rounded
        color="primary"
      />
    </div>
  </v-alert>
</template>

<script lang="ts" setup>
defineProps<{
  isRunning: boolean
  statusLabel: string
  progressLabel: string
  progressPercent: number
}>()
</script>

<style scoped>
.sapling-import__job-status {
  min-height: 76px;
  overflow: visible;
}

.sapling-import__job-status :deep(.v-alert__content) {
  min-width: 0;
  padding-block: 2px;
  overflow: visible;
}

.sapling-import__job-status-content {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.sapling-import__job-status-header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 16px;
  min-width: 0;
  line-height: 1.25;
}

.sapling-import__job-status-header strong {
  min-width: 0;
  overflow-wrap: anywhere;
}

.sapling-import__job-status-header span {
  min-width: 0;
  overflow-wrap: anywhere;
  opacity: 0.82;
}

.sapling-import__job-progress {
  align-self: stretch;
  width: 100%;
}

@media (max-width: 600px) {
  .sapling-import__job-status {
    min-height: 88px;
  }

  .sapling-import__job-status-header {
    display: grid;
  }
}
</style>
