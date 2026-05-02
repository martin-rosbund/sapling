<template>
  <aside class="sapling-event-context">
    <SaplingWorkFilterPanel @update:selected-peoples="emit('updateSelectedPeoples', $event)" />

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
import SaplingWorkFilterPanel from '@/components/filter/SaplingWorkFilterPanel.vue'
import type { EventAgendaItem } from '@/composables/event/useSaplingEvent'

defineProps<{
  upcomingEvents: EventAgendaItem[]
  currentCalendarViewLabel: string
  currentCalendarLayoutLabel: string
}>()

const emit = defineEmits<{
  (event: 'updateSelectedPeoples', value: string[]): void
  (event: 'openEvent', value: CalendarEvent): void
}>()
</script>
