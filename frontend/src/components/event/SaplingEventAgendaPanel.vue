<template>
  <SaplingSurface
    as="section"
    class="sapling-section-panel sapling-panel-shell sapling-event-panel sapling-event-agenda-panel"
  >
    <div class="sapling-section-header sapling-event-panel__header">
      <div>
        <p class="sapling-eyebrow sapling-event-panel__eyebrow">{{ $t('navigation.event') }}</p>
        <h2 class="sapling-section-title sapling-event-panel__title">{{ $t('event.today') }}</h2>
      </div>
    </div>

    <div v-if="upcomingEvents.length > 0" class="sapling-scroll-list sapling-event-agenda-list">
      <div
        v-for="item in upcomingEvents"
        :key="item.key"
        class="sapling-interactive-list-item sapling-event-agenda-item"
        :class="{
          'sapling-interactive-list-item--active': item.isOngoing,
          'sapling-event-agenda-item--active': item.isOngoing,
        }"
        @click="emit('openEvent', item.calendarEvent)"
        @keydown.enter.prevent="emit('openEvent', item.calendarEvent)"
        @keydown.space.prevent="emit('openEvent', item.calendarEvent)"
        role="button"
        tabindex="0"
      >
        <div
          class="sapling-interactive-list-item__icon sapling-event-agenda-item__icon"
          :style="{ '--sapling-event-accent': item.accentColor }"
        >
          <v-icon size="18">{{ item.icon }}</v-icon>
        </div>

        <div class="sapling-interactive-list-item__content sapling-event-agenda-item__content">
          <div class="sapling-interactive-list-item__row sapling-event-agenda-item__row">
            <strong>{{ item.title }}</strong>
            <v-icon v-if="item.isRecurring" size="14">mdi-repeat</v-icon>
          </div>
          <div class="sapling-interactive-list-item__row sapling-event-agenda-item__row">
            <small>{{ item.timeLabel || item.dateLabel }}</small>
          </div>
          <p>{{ item.description || item.dateLabel }}</p>

          <div
            v-if="item.participantNames.length > 0"
            class="sapling-event-agenda-item__participants"
            @click.stop
          >
            <span
              v-for="name in getVisibleParticipantNames(item)"
              :key="`${item.key}-${name}`"
              class="sapling-soft-chip sapling-event-agenda-item__participant"
            >
              {{ name }}
            </span>

            <button
              v-if="getHiddenParticipantCount(item) > 0"
              class="sapling-soft-chip sapling-soft-chip--button sapling-event-agenda-item__participant-more"
              type="button"
              @click.stop="showAllParticipants(item.key)"
            >
              +{{ getHiddenParticipantCount(item) }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else
      class="sapling-empty-state-panel sapling-empty-state-panel--compact sapling-event-panel__empty-state"
    >
      <v-icon size="26">mdi-calendar-check-outline</v-icon>
      <strong>{{ $t('event.allDoneToday') }}</strong>
    </div>
  </SaplingSurface>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import SaplingSurface from '@/components/common/SaplingSurface.vue'
import type { EventAgendaItem } from '@/composables/event/useSaplingEvent'
import type { CalendarEvent } from 'vuetify/lib/components/VCalendar/types.mjs'

defineProps<{
  upcomingEvents: EventAgendaItem[]
}>()

const emit = defineEmits<{
  (event: 'openEvent', value: CalendarEvent): void
}>()

const expandedParticipantKeys = ref<Set<string>>(new Set())

function getVisibleParticipantNames(item: EventAgendaItem) {
  if (expandedParticipantKeys.value.has(item.key)) {
    return item.participantNames
  }

  return item.participantNames.slice(0, 5)
}

function getHiddenParticipantCount(item: EventAgendaItem) {
  if (expandedParticipantKeys.value.has(item.key)) {
    return 0
  }

  return Math.max(item.participantNames.length - 5, 0)
}

function showAllParticipants(key: string) {
  expandedParticipantKeys.value = new Set(expandedParticipantKeys.value).add(key)
}
</script>
