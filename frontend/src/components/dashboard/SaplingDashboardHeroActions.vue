<template>
  <div class="sapling-action-stack">
    <div class="sapling-action-cluster">
      <v-btn
        color="primary"
        variant="plain"
        prepend-icon="mdi-chart-box-plus-outline"
        :aria-label="$t('kpi.addKpi')"
        :title="$t('kpi.addKpi')"
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
        :aria-label="$t('dashboard.addDashboard')"
        :title="$t('dashboard.addDashboard')"
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
        :aria-label="$t('dashboard.loadTemplate')"
        :title="$t('dashboard.loadTemplate')"
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
        :aria-label="$t('dashboard.saveAsTemplate')"
        :title="$t('dashboard.saveAsTemplate')"
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
  currentPersonLoaded: boolean
}>()

const emit = defineEmits<{
  (event: 'addKpi'): void
  (event: 'openDashboard'): void
  (event: 'openTemplateLoad'): void
  (event: 'openTemplateSave'): void
}>()
</script>
