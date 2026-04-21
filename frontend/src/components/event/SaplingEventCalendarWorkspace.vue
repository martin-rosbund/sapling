<template>
  <template v-if="calendarViewMode === 'single'">
    <SaplingEventCalendar
      v-model="calendarValue"
      :events="events"
      :calendar-display-type="calendarDisplayType"
      :calendar-weekdays="calendarWeekdays"
      :work-hours="workHours"
      :show-work-hour-background="showWorkHourBackground"
      :calendar-style="'flex: 1 1 100%; max-width: 100%'"
      :show-resize-handle="true"
      :get-work-hour-style="getWorkHourStyle"
      :get-event-color="getEventColor"
      :now-y="nowY"
      :get-events="getEvents"
      :open-event="openEvent"
      :start-drag="startDrag"
      :start-time="startTime"
      :cancel-drag="cancelDrag"
      :mouse-move="mouseMove"
      :end-drag="endDrag"
      :extend-bottom="extendBottom"
    />
  </template>

  <template v-else>
    <div class="sapling-event-sidebyside-shell">
      <div class="sapling-event-sidebyside-grid" :style="sideBySideGridStyle">
        <section
          v-for="personId in selectedPeoples"
          :key="personId"
          class="sapling-event-sidebyside-column"
        >
          <header class="sapling-event-sidebyside-column__header">
            <span>{{ getPersonName(personId) }}</span>
          </header>

          <div class="sapling-event-sidebyside-column__calendar">
            <SaplingEventCalendar
              v-model="calendarValue"
              :events="getSideBySideEvents(personId)"
              :calendar-display-type="calendarDisplayType"
              :calendar-weekdays="calendarWeekdays"
              :work-hours="workHours"
              :show-work-hour-background="showWorkHourBackground"
              :calendar-style="'width: 100%; max-width: 100%; height: 100%'"
              :get-work-hour-style="getWorkHourStyle"
              :get-event-color="getEventColor"
              :now-y="nowY"
              :get-events="getEvents"
              :open-event="openEvent"
              :start-drag="startDrag"
              :start-time="startTime"
              :cancel-drag="cancelDrag"
              :mouse-move="mouseMove"
              :end-drag="endDrag"
              :extend-bottom="extendBottom"
            />
          </div>
        </section>
      </div>
    </div>
  </template>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import type { CSSProperties } from 'vue'
import type { WorkHourWeekItem } from '@/entity/entity'
import SaplingEventCalendar from '@/components/event/SaplingEventCalendar.vue'
import type { CalendarEvent } from 'vuetify/lib/components/VCalendar/types.mjs'

interface CalendarDatePair {
  start: CalendarDateItem
  end: CalendarDateItem
}

interface CalendarDateItem {
  date: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

type CalendarDisplayType = 'day' | 'week' | 'month'
type CalendarViewMode = 'single' | 'sidebyside'

const props = defineProps<{
  modelValue: string
  calendarViewMode: CalendarViewMode
  events: CalendarEvent[]
  calendarDisplayType: CalendarDisplayType
  calendarWeekdays?: number[]
  workHours: WorkHourWeekItem | null
  showWorkHourBackground: boolean
  selectedPeoples: number[]
  sideBySideGridStyle: CSSProperties
  getWorkHourStyle: (date: string) => CSSProperties
  getEventColor: (event: CalendarEvent) => string
  nowY: () => string
  getEvents: (value: CalendarDatePair) => void | Promise<void>
  openEvent: (event: CalendarEvent) => void
  startDrag: (nativeEvent: Event, payload: { event: CalendarEvent; timed: boolean }) => void
  startTime: (nativeEvent: Event, timeSlot: CalendarDateItem) => void
  cancelDrag: () => void
  mouseMove: (nativeEvent: Event, timeSlot: CalendarDateItem) => void
  endDrag: () => void
  extendBottom: (event: CalendarEvent) => void
  getPersonName: (personId: number) => string
  getSideBySideEvents: (personId: number) => CalendarEvent[]
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

const calendarValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})
</script>
