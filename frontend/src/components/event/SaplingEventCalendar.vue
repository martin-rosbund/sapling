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

    <template v-slot:event="{ event, eventSummary }">
      <div
        class="v-event-draggable"
        style="
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 4px;
          height: 100%;
          position: relative;
        "
      >
        <div
          :style="{
            position: 'absolute',
            left: '0',
            top: '0',
            bottom: '0',
            width: '24px',
            background: event?.event?.status?.color,
          }"
        ></div>
        <div style="display: flex; align-items: center; gap: 4px; margin-left: 2px">
          <v-icon small>{{ event.event?.type?.icon ? event.event.type.icon : 'mdi-calendar-edit' }}</v-icon>
          <component style="margin-left: 3px" :is="eventSummary"></component>
        </div>
        <div
          style="
            flex: 1 1 auto;
            overflow: hidden;
            white-space: normal;
            word-break: break-word;
            padding: 2px;
            margin-left: 24px;
          "
        >
          {{ event.event?.description }}
        </div>
      </div>

      <div
        v-if="props.showResizeHandle"
        class="v-event-drag-bottom"
        @mousedown.stop="props.extendBottom(event)"
        style="
          position: absolute;
          right: 2px;
          bottom: 2px;
          z-index: 2;
          cursor: se-resize;
        "
      >
        <v-icon small>mdi-resize-bottom-right</v-icon>
      </div>
    </template>
  </v-calendar>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import type { CSSProperties } from 'vue'
import type { WorkHourWeekItem } from '@/entity/entity'
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
</script>

<style scoped>
.sapling-event-vcalendar {
  height: 100%;
  min-height: 0;
}

.v-current-time {
  height: 2px;
  background-color: #ea4335;
  position: absolute;
  left: -1px;
  right: 0;
  pointer-events: none;
}

.v-current-time.first::before {
  content: '';
  position: absolute;
  background-color: #ea4335;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: -5px;
  margin-left: -6.5px;
}
</style>