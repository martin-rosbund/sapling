<template>
  <div class="sapling-dashboard__actions">
    <v-btn
      color="primary"
      variant="plain"
      prepend-icon="mdi-chart-box-plus-outline"
      class="sapling-dashboard__action"
      :disabled="!hasDashboards || !currentPersonLoaded"
      @click="emit('addKpi')"
    >
      {{ $t('kpi.addKpi') }}
    </v-btn>
    <v-btn
      color="primary"
      variant="plain"
      prepend-icon="mdi-plus-circle-outline"
      class="sapling-dashboard__action"
      :disabled="!currentPersonLoaded"
      @click="emit('openDashboard')"
    >
      {{ $t('dashboard.addDashboard') }}
    </v-btn>
    <v-btn
      v-if="canOpenFavorites"
      variant="plain"
      prepend-icon="mdi-bookmark-multiple-outline"
      class="sapling-dashboard__action"
      @click="emit('openFavorites')"
    >
      {{ $t('navigation.favorite') }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  hasDashboards: boolean
  canOpenFavorites: boolean
  currentPersonLoaded: boolean
}>()

const emit = defineEmits<{
  (event: 'addKpi'): void
  (event: 'openDashboard'): void
  (event: 'openFavorites'): void
}>()
</script>
