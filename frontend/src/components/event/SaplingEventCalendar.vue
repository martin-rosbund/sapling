<template>
  <v-calendar
    v-model="calendarValue"
    class="sapling-event-vcalendar glass-panel"
    :class="props.calendarClass"
    color="primary"
    :event-color="props.getEventColor"
    :event-ripple="false"
    :events="props.events"
    :type="props.calendarDisplayType"
    :weekdays="props.calendarWeekdays"
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
        class="sapling-calendar-event-card"
        :class="getEventCardClasses(event)"
        :style="getEventCardStyle(event)"
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
              <v-icon v-if="isRecurringOccurrence(event)" size="14">mdi-repeat</v-icon>
              <span class="sapling-calendar-event-card__time">{{
                formatEventTimeRange(event)
              }}</span>
            </div>

            <strong
              v-if="shouldInlineTitle(event)"
              class="sapling-calendar-event-card__title sapling-calendar-event-card__title--inline"
            >
              {{ event.event?.title || event.name || '' }}
            </strong>
          </div>

          <strong v-if="!shouldInlineTitle(event)" class="sapling-calendar-event-card__title">
            {{ event.event?.title || event.name || '' }}
          </strong>
          <p
            v-if="shouldShowDescription(event) && event.event?.description"
            class="sapling-calendar-event-card__description"
          >
            {{ event.event.description }}
          </p>
        </div>

        <button
          v-if="props.showResizeHandle && !isRecurringOccurrence(event)"
          class="sapling-calendar-event-card__resize v-event-drag-bottom"
          type="button"
          @mousedown.stop="props.extendBottom(event)"
        >
          <v-icon :size="getResizeHandleIconSize(event)">mdi-resize-bottom-right</v-icon>
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
type EventCardDensity = 'default' | 'compact' | 'inline'

const COMPACT_EVENT_MAX_MINUTES = 90
const INLINE_EVENT_MAX_MINUTES = 90

const props = withDefaults(
  defineProps<{
    modelValue: string
    events: CalendarEvent[]
    calendarDisplayType: CalendarDisplayType
    calendarWeekdays?: number[]
    workHours: WorkHourWeekItem | null
    showWorkHourBackground: boolean
    calendarClass?: string | string[] | Record<string, boolean>
    showResizeHandle?: boolean
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
  }>(),
  {
    calendarWeekdays: undefined,
    calendarClass: '',
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

function getEventDurationMinutes(event: CalendarEvent) {
  if (!event.timed) {
    return Number.POSITIVE_INFINITY
  }

  const start = new Date(event.start).getTime()
  const end = new Date(event.end).getTime()

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return Number.POSITIVE_INFINITY
  }

  return Math.max(Math.round((end - start) / 60000), 0)
}

function getEventCardDensity(event: CalendarEvent): EventCardDensity {
  if (props.calendarDisplayType === 'month') {
    return 'inline'
  }

  const durationMinutes = getEventDurationMinutes(event)

  if (durationMinutes <= INLINE_EVENT_MAX_MINUTES) {
    return 'inline'
  }

  if (durationMinutes <= COMPACT_EVENT_MAX_MINUTES) {
    return 'compact'
  }

  return 'default'
}

function getEventCardClasses(event: CalendarEvent) {
  const density = getEventCardDensity(event)

  return {
    'v-event-draggable': !isRecurringOccurrence(event),
    'sapling-calendar-event-card--compact': density !== 'default',
    'sapling-calendar-event-card--inline': density === 'inline',
    'sapling-calendar-event-card--resizable':
      props.showResizeHandle && !isRecurringOccurrence(event),
    'sapling-calendar-event-card--readonly': isRecurringOccurrence(event),
  }
}

function getEventCardStyle(event: CalendarEvent): CSSProperties {
  return {
    '--sapling-calendar-event-card-color': props.getEventColor(event),
  }
}

function shouldInlineTitle(event: CalendarEvent) {
  return getEventCardDensity(event) === 'inline'
}

function shouldShowDescription(event: CalendarEvent) {
  return getEventCardDensity(event) === 'default'
}

function getResizeHandleIconSize(event: CalendarEvent) {
  return shouldInlineTitle(event) ? 12 : 14
}

function isRecurringOccurrence(event: CalendarEvent) {
  return Boolean(
    (event as CalendarEvent & { isRecurringOccurrence?: boolean }).isRecurringOccurrence,
  )
}
</script>
