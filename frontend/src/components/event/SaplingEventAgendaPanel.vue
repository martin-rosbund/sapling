<template>
  <section class="sapling-event-panel glass-panel">
    <div class="sapling-event-panel__header">
      <div>
        <p class="sapling-event-panel__eyebrow">{{ $t('navigation.event') }}</p>
        <h2 class="sapling-event-panel__title">{{ $t('event.today') }}</h2>
      </div>
    </div>

    <div v-if="upcomingEvents.length > 0" class="sapling-event-agenda-list">
      <button
        v-for="item in upcomingEvents"
        :key="item.key"
        class="sapling-event-agenda-item"
        :class="{ 'sapling-event-agenda-item--active': item.isOngoing }"
        type="button"
        @click="emit('openEvent', item.calendarEvent)"
      >
        <div class="sapling-event-agenda-item__icon" :style="{ '--sapling-event-accent': item.accentColor }">
          <v-icon size="18">{{ item.icon }}</v-icon>
        </div>

        <div class="sapling-event-agenda-item__content">
          <div class="sapling-event-agenda-item__row">
            <strong>{{ item.title }}</strong>
          </div>
          <div class="sapling-event-agenda-item__row">
            <small>{{ item.timeLabel || item.dateLabel }}</small>
          </div>
          <p>{{ item.description || item.dateLabel }}</p>
          <small v-if="item.participantCount > 0">
            {{ item.participantCount }} {{ $t('navigation.person') }}
          </small>
        </div>
      </button>
    </div>

    <div v-else class="sapling-event-panel__empty-state">
      <v-icon size="26">mdi-calendar-clock-outline</v-icon>
      <strong>{{ currentCalendarViewLabel }}</strong>
      <span>{{ currentCalendarLayoutLabel }}</span>
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { EventAgendaItem } from '@/composables/event/useSaplingEvent'
import type { CalendarEvent } from 'vuetify/lib/components/VCalendar/types.mjs'

defineProps<{
  upcomingEvents: EventAgendaItem[]
  currentCalendarViewLabel: string
  currentCalendarLayoutLabel: string
}>()

const emit = defineEmits<{
  (event: 'openEvent', value: CalendarEvent): void
}>()
</script>

<style scoped src="@/assets/styles/SaplingCalendar.css"></style>