<template>
  <div class="sapling-dashboard__actions">
    <div v-if="canOpenFavorites" class="sapling-dashboard__secondary-actions">
      <v-btn
        variant="plain"
        prepend-icon="mdi-bookmark-multiple-outline"
        class="sapling-dashboard__action"
        @click="emit('openFavorites')"
      >
        <template v-if="$vuetify.display.mdAndUp">
          {{ $t('navigation.favorite') }}
        </template>
      </v-btn>
    </div>

    <div class="sapling-dashboard__primary-actions">
      <v-btn
        color="primary"
        variant="plain"
        prepend-icon="mdi-chart-box-plus-outline"
        class="sapling-dashboard__action"
        :disabled="!hasDashboards || !currentPersonLoaded"
        @click="emit('addKpi')"
      >
        <template v-if="$vuetify.display.mdAndUp">
          {{ $t('kpi.addKpi') }}
        </template>
      </v-btn>
      <v-btn
        color="primary"
        variant="plain"
        prepend-icon="mdi-plus-circle-outline"
        class="sapling-dashboard__action"
        :disabled="!currentPersonLoaded"
        @click="emit('openDashboard')"
      >
        <template v-if="$vuetify.display.mdAndUp">
          {{ $t('dashboard.addDashboard') }}
        </template>
      </v-btn>
      <v-btn
        color="primary"
        variant="plain"
        prepend-icon="mdi-file-import-outline"
        class="sapling-dashboard__action"
        :disabled="!currentPersonLoaded"
        @click="emit('openTemplateLoad')"
      >
        <template v-if="$vuetify.display.mdAndUp">
          {{ $t('dashboard.loadTemplate') }}
        </template>
      </v-btn>
      <v-btn
        color="primary"
        variant="plain"
        prepend-icon="mdi-content-save-outline"
        class="sapling-dashboard__action"
        :disabled="!hasDashboards || !currentPersonLoaded"
        @click="emit('openTemplateSave')"
      >
        <template v-if="$vuetify.display.mdAndUp">
          {{ $t('dashboard.saveAsTemplate') }}
        </template>
      </v-btn>
    </div>
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
  (event: 'openTemplateLoad'): void
  (event: 'openTemplateSave'): void
  (event: 'openFavorites'): void
}>()
</script>
