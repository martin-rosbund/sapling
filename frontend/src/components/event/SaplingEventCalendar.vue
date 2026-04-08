<template>
  <v-calendar
    v-model="calendarValue"
    class="sapling-event-vcalendar glass-panel"
    color="primary"
    :event-color="props.getEventColor"
    :event-ripple="false"
    :events="props.events"
    :type="props.calendarDisplayType"
    :weekdays="props.calendarWeekdays"
    :style="props.calendarStyle"
    @change="props.getEvents"
    @mousedown:event="props.startDrag"
    @mousedown:time="props.startTime"
    @mouseleave="props.cancelDrag"
    @mousemove:time="props.mouseMove"
    @mouseup:time="props.endDrag"
  >
    <template v-slot:day-body="{ date, week }">
      <div
        v-if="props.workHours && props.showWorkHourBackground"
        class="workhour-bg"
        :style="props.getWorkHourStyle(date)"
      ></div>
      <div
        :class="{ first: date === week?.[0]?.date }"
        :style="{ top: props.nowY() }"
        class="v-current-time"
      ></div>
    </template>

    <template v-slot:event="{ event }">
      <div
        class="sapling-calendar-event-card v-event-draggable"
        role="button"
        tabindex="0"
        @click.stop="props.openEvent(event)"
        @keydown.enter.stop.prevent="props.openEvent(event)"
        @keydown.space.stop.prevent="props.openEvent(event)"
      >
        <div
          class="sapling-calendar-event-card__accent"
          :style="{ background: event?.event?.status?.color || props.getEventColor(event) }"
        ></div>

        <div class="sapling-calendar-event-card__content">
          <div class="sapling-calendar-event-card__header">
            <div class="sapling-calendar-event-card__type">
              <v-icon size="14">{{ event.event?.type?.icon || 'mdi-calendar-edit' }}</v-icon>
              <span>{{ formatEventTimeRange(event) }} </span>
            </div>

            <!--
            <span
              class="sapling-calendar-event-card__status-dot"
              :style="{ background: event?.event?.status?.color || props.getEventColor(event) }"
            ></span>
            -->
          </div>

          <strong class="sapling-calendar-event-card__title">
            {{ event.event?.title || event.name || '' }}
          </strong>

          
          <p v-if="event.event?.description" class="sapling-calendar-event-card__description">
            {{ event.event.description }}
          </p>
          

          <!--
          <div class="sapling-calendar-event-card__meta">
            <span v-if="getParticipantCount(event) > 0" class="sapling-calendar-event-card__meta-item">
              <v-icon size="13">mdi-account-group-outline</v-icon>
              {{ getParticipantCount(event) }}
            </span>
            <span v-if="event.event?.status?.description" class="sapling-calendar-event-card__meta-item">
              {{ event.event.status.description }}
            </span>
          </div>
          -->
          
        </div>

        <button
          v-if="props.showResizeHandle"
          class="sapling-calendar-event-card__resize v-event-drag-bottom"
          type="button"
          @mousedown.stop="props.extendBottom(event)"
        >
          <v-icon size="14">mdi-resize-bottom-right</v-icon>
        </button>
      </div>
    </template>
  </v-calendar>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import type { CSSProperties } from 'vue'
import type { WorkHourWeekItem } from '@/entity/entity'
import type { CalendarEvent } from 'vuetify/lib/components/VCalendar/types.mjs'
import { formatDateValue, formatTimeValue } from '@/utils/saplingFormatUtil'

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

const props = withDefaults(
  defineProps<{
    modelValue: string
    events: CalendarEvent[]
    calendarDisplayType: CalendarDisplayType
    calendarWeekdays?: number[]
    workHours: WorkHourWeekItem | null
    showWorkHourBackground: boolean
    calendarStyle?: string
    showResizeHandle?: boolean
    getWorkHourStyle: (date: string) => CSSProperties
    getEventColor: (event: CalendarEvent) => string
    nowY: () => string
    getEvents: (value: CalendarDatePair) => void | Promise<void>
    openEvent: (event: CalendarEvent) => void
    startDrag: (
      nativeEvent: Event,
      payload: { event: CalendarEvent; timed: boolean },
    ) => void
    startTime: (nativeEvent: Event, timeSlot: CalendarDateItem) => void
    cancelDrag: () => void
    mouseMove: (nativeEvent: Event, timeSlot: CalendarDateItem) => void
    endDrag: () => void
    extendBottom: (event: CalendarEvent) => void
  }>(),
  {
    calendarWeekdays: undefined,
    calendarStyle: '',
    showResizeHandle: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

const calendarValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

function formatEventTimeRange(event: CalendarEvent) {
  const start = new Date(event.start)
  const end = new Date(event.end)

  if (!event.timed) {
    return formatDateValue(start)
  }

  return `${formatTimeValue(start)} - ${formatTimeValue(end)}`
}
</script>

<style scoped src="@/assets/styles/SaplingEventCalendar.css"></style>