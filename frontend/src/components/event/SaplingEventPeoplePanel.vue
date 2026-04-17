<template>
  <section class="sapling-event-panel glass-panel">
    <div class="sapling-event-panel__header">
      <div>
        <p class="sapling-event-panel__eyebrow">{{ $t('navigation.person') }}</p>
        <h2 class="sapling-event-panel__title">
          {{ selectedPeoples.length }} {{ $t('global.selected') }}
        </h2>
      </div>

      <v-btn icon="mdi-filter-variant" variant="text" @click="emit('openFilter')" />
    </div>

    <div class="sapling-event-selection-chips">
      <v-chip
        v-for="person in selectedPeoplePreview"
        :key="person.handle"
        :color="person.isOwn ? 'primary' : undefined"
        :variant="person.isOwn ? 'flat' : 'outlined'"
        size="small"
      >
        {{ person.name }}
      </v-chip>

      <v-chip v-if="selectedPeopleOverflowCount > 0" size="small" variant="outlined">
        +{{ selectedPeopleOverflowCount }}
      </v-chip>

      <div v-if="selectedPeoplePreview.length === 0" class="sapling-event-panel__empty-inline">
        <v-icon size="18">mdi-account-group-outline</v-icon>
        <span>0 {{ $t('navigation.person') }}</span>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { SelectedPersonPreviewItem } from '@/composables/event/useSaplingEvent'

defineProps<{
  selectedPeoples: number[]
  selectedPeoplePreview: SelectedPersonPreviewItem[]
  selectedPeopleOverflowCount: number
}>()

const emit = defineEmits<{
  (event: 'openFilter'): void
}>()
</script>

<style scoped src="@/assets/styles/SaplingCalendar.css"></style>
