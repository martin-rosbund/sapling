<template>
  <aside class="sapling-event-context">
    <SaplingWorkFilterPanel
      v-if="!isMobileFilterLayout"
      @update:selected-peoples="emit('updateSelectedPeoples', $event)"
    />

    <SaplingEventPeoplePanel
      v-else
      :selected-peoples="selectedPeoples"
      :selected-people-preview="selectedPeoplePreview"
      :selected-people-overflow-count="selectedPeopleOverflowCount"
      @open-filter="emit('openFilter')"
    />

    <SaplingEventAgendaPanel
      :upcoming-events="upcomingEvents"
      @open-event="emit('openEvent', $event)"
    />
  </aside>
</template>

<script lang="ts" setup>
import type { CalendarEvent } from 'vuetify/lib/components/VCalendar/types.mjs'
import SaplingEventAgendaPanel from '@/components/event/SaplingEventAgendaPanel.vue'
import SaplingEventPeoplePanel from '@/components/event/SaplingEventPeoplePanel.vue'
import SaplingWorkFilterPanel from '@/components/filter/SaplingWorkFilterPanel.vue'
import type {
  EventAgendaItem,
  SelectedPersonPreviewItem,
} from '@/composables/event/useSaplingEvent'

defineProps<{
  isMobileFilterLayout: boolean
  upcomingEvents: EventAgendaItem[]
  selectedPeoples: number[]
  selectedPeoplePreview: SelectedPersonPreviewItem[]
  selectedPeopleOverflowCount: number
}>()

const emit = defineEmits<{
  (event: 'updateSelectedPeoples', value: string[]): void
  (event: 'openFilter'): void
  (event: 'openEvent', value: CalendarEvent): void
}>()
</script>
