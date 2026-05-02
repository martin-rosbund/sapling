<template>
  <section class="sapling-dashboard__empty glass-panel">
    <v-icon size="56" color="primary">mdi-view-dashboard-edit-outline</v-icon>
    <h2 class="sapling-dashboard__empty-title">{{ $t('dashboard.emptyTitle') }}</h2>
    <p class="sapling-dashboard__empty-text">
      {{ $t('dashboard.emptyText') }}
    </p>
    <div class="sapling-dashboard__empty-actions">
      <v-btn color="primary" prepend-icon="mdi-plus-circle-outline" @click="emit('openDashboard')">
        {{ $t('global.add') }}
      </v-btn>
      <v-btn
        color="primary"
        variant="outlined"
        prepend-icon="mdi-file-import-outline"
        @click="emit('openTemplateLoad')"
      >
        {{ $t('dashboard.loadTemplate') }}
      </v-btn>
    </div>
  </section>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (event: 'openDashboard'): void
  (event: 'openTemplateLoad'): void
}>()
</script>
