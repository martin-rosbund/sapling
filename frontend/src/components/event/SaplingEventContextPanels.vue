<template>
  <aside class="sapling-event-context">
    <SaplingEventPeoplePanel
      :selected-peoples="selectedPeoples"
      :selected-people-preview="selectedPeoplePreview"
      :selected-people-overflow-count="selectedPeopleOverflowCount"
      @open-filter="emit('openFilter')"
    />

    <SaplingEventAgendaPanel
      :upcoming-events="upcomingEvents"
      :current-calendar-view-label="currentCalendarViewLabel"
      :current-calendar-layout-label="currentCalendarLayoutLabel"
      @open-event="emit('openEvent', $event)"
    />
  </aside>
</template>

<script lang="ts" setup>
import type { CalendarEvent } from 'vuetify/lib/components/VCalendar/types.mjs'
import SaplingEventAgendaPanel from '@/components/event/SaplingEventAgendaPanel.vue'
import SaplingEventPeoplePanel from '@/components/event/SaplingEventPeoplePanel.vue'
import type {
  EventAgendaItem,
  SelectedPersonPreviewItem,
} from '@/composables/event/useSaplingEvent'

defineProps<{
  selectedPeoples: number[]
  selectedPeoplePreview: SelectedPersonPreviewItem[]
  selectedPeopleOverflowCount: number
  upcomingEvents: EventAgendaItem[]
  currentCalendarViewLabel: string
  currentCalendarLayoutLabel: string
}>()

const emit = defineEmits<{
  (event: 'openFilter'): void
  (event: 'openEvent', value: CalendarEvent): void
}>()
</script>
