<template>
  <sapling-header />
  <sapling-footer />
  <v-row class="fill-height">
    <v-col>
      <v-btn-toggle
        v-model="calendarType"
        mandatory
        color="primary"
      >
        <v-btn value="day">Tag</v-btn>
        <v-btn value="week">Woche</v-btn>
        <v-btn value="month">Monat</v-btn>
        <v-btn value="4day">4 Tage</v-btn>
      </v-btn-toggle>
      <v-sheet height="100%">
        <v-calendar
          ref="calendar"
          v-model="value"
          :event-color="(event) => getEventColor(event as CalendarEvent)"
          :event-ripple="false"
          :events="events"
          color="primary"
          :type="calendarType"
          @change="getEvents"
          @mousedown:event="(e, args) => startDrag(e, { event: args.event as CalendarEvent, timed: args.timed })"
          @mousedown:time="startTime"
          @mouseleave="cancelDrag"
          @mousemove:time="mouseMove"
          @mouseup:time="endDrag"
        >
          <template v-slot:event="{ event, timed, eventSummary }">
            <div class="v-event-draggable">
              <component :is="eventSummary"></component>
            </div>
            <div
              v-if="timed"
              class="v-event-drag-bottom"
              @mousedown.stop="extendBottom(event as CalendarEvent)"
            ></div>
          </template>
        </v-calendar>
      </v-sheet>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">


import { ref } from 'vue'

// Minimale lokale Typdefinitionen für Vuetify-Calendar
interface CalendarEvent {
  name: string;
  color: string;
  start: number;
  end: number;
  timed: boolean;
  [key: string]: unknown;
}
interface CalendarTimestamp {
  date: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}
interface CalendarDayBodySlotScope extends CalendarTimestamp {
  // weitere Properties werden nicht benötigt
}

const value = ref<string>('')
const events = ref<CalendarEvent[]>([])
const calendarType = ref<string>('4day')
const colors = [
  '#2196F3', '#3F51B5', '#673AB7', '#00BCD4', '#4CAF50', '#FF9800', '#757575',
]
const names = [
  'Meeting', 'Holiday', 'PTO', 'Travel', 'Event', 'Birthday', 'Conference', 'Party',
]
const dragEvent = ref<CalendarEvent | null>(null)
const dragTime = ref<number | null>(null)
const createEvent = ref<CalendarEvent | null>(null)
const createStart = ref<number | null>(null)
const extendOriginal = ref<number | null>(null)


function startDrag (
  nativeEvent: Event,
  { event, timed }: { event: CalendarEvent; timed: boolean }
) {
  if (event && timed) {
    dragEvent.value = event
    dragTime.value = null
    extendOriginal.value = null
  }
}


function startTime (nativeEvent: Event, tms: CalendarDayBodySlotScope) {
  const mouse = toTime(tms)

  if (dragEvent.value && dragTime.value === null) {
    const start = dragEvent.value.start as number
    dragTime.value = mouse - start
  } else {
    createStart.value = roundTime(mouse)
    createEvent.value = {
      name: `Event #${events.value.length}`,
      color: rndElement(colors),
      start: createStart.value!,
      end: createStart.value!,
      timed: true,
    }
    events.value.push(createEvent.value)
  }
}


function extendBottom (event: CalendarEvent) {
  createEvent.value = event
  createStart.value = event.start as number
  extendOriginal.value = event.end as number
}


function mouseMove (nativeEvent: Event, tms: CalendarDayBodySlotScope) {
  const mouse = toTime(tms)

  if (dragEvent.value && dragTime.value !== null) {
    const start = dragEvent.value.start as number
    const end = dragEvent.value.end as number
    const duration = end - start
    const newStartTime = mouse - dragTime.value
    const newStart = roundTime(newStartTime)
    const newEnd = newStart + duration

    dragEvent.value.start = newStart
    dragEvent.value.end = newEnd
  } else if (createEvent.value && createStart.value !== null) {
    const mouseRounded = roundTime(mouse, false)
    const min = Math.min(mouseRounded, createStart.value)
    const max = Math.max(mouseRounded, createStart.value)

    createEvent.value.start = min
    createEvent.value.end = max
  }
}


  function endDrag () {
    dragTime.value = null
    dragEvent.value = null
    createEvent.value = null
    createStart.value = null
    extendOriginal.value = null
  }


  function cancelDrag () {
    if (createEvent.value) {
      if (extendOriginal.value !== null) {
        createEvent.value.end = extendOriginal.value
      } else {
        const i = events.value.indexOf(createEvent.value)
        if (i !== -1) {
          events.value.splice(i, 1)
        }
      }
    }

    createEvent.value = null
    createStart.value = null
    dragTime.value = null
    dragEvent.value = null
  }


function roundTime (time: number, down = true): number {
  const roundTo = 15 // minutes
  const roundDownTime = roundTo * 60 * 1000

  return down
    ? time - (time % roundDownTime)
    : time + (roundDownTime - (time % roundDownTime))
}


function toTime (tms: CalendarTimestamp): number {
  return new Date(tms.year, tms.month - 1, tms.day, tms.hour, tms.minute).getTime()
}


function getEventColor (event: CalendarEvent): string | undefined {
  const color = event.color as string | undefined
  if (!color) return undefined
  const rgb = parseInt(color.substring(1), 16)
  const r = (rgb >> 16) & 0xFF
  const g = (rgb >> 8) & 0xFF
  const b = (rgb >> 0) & 0xFF

  return event === dragEvent.value
    ? `rgba(${r}, ${g}, ${b}, 0.7)`
    : event === createEvent.value
      ? `rgba(${r}, ${g}, ${b}, 0.7)`
      : color
}


function getEvents ({ start, end }: { start: CalendarTimestamp, end: CalendarTimestamp }) {
  const newEvents: CalendarEvent[] = []

  const min = new Date(`${start.date}T00:00:00`).getTime()
  const max = new Date(`${end.date}T23:59:59`).getTime()
  const days = (max - min) / 86400000
  const eventCount = rnd(days, days + 20)

  for (let i = 0; i < eventCount; i++) {
    const timed = rnd(0, 3) !== 0
    const firstTimestamp = rnd(min, max)
    const secondTimestamp = rnd(2, timed ? 8 : 288) * 900000
    const startTime = firstTimestamp - (firstTimestamp % 900000)
    const endTime = startTime + secondTimestamp

    newEvents.push({
      name: rndElement(names),
      color: rndElement(colors),
      start: startTime,
      end: endTime,
      timed,
    })
  }

  events.value = newEvents
}

function rnd (a: number, b: number): number {
  return Math.floor((b - a + 1) * Math.random()) + a
}

function rndElement<T> (arr: T[]): T {
  // Fallback: falls das Array leer ist, gib das erste Element (undefined Verhalten, aber TS safe)
  return arr.length > 0 ? arr[rnd(0, arr.length - 1)] : arr[0];
}
</script>

<script lang="ts">
import { defineComponent } from 'vue';
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingHeader from '@/components/SaplingHeader.vue';
import { VCalendar } from 'vuetify/labs/VCalendar';

export default defineComponent({
  name: 'CalendarView',
    components: {
    SaplingHeader,
    SaplingFooter,
    VCalendar
  },
  data() {
    return {
      calendarValue: new Date().toISOString().substring(0, 10),
      events: [
        {
          name: 'Meeting mit Team',
          start: new Date().toISOString().substring(0, 10),
          color: 'blue',
        },
        {
          name: 'Projekt-Deadline',
          start: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
          color: 'red',
        },
      ],
    };
  },
});
</script>

<style scoped lang="css">
.v-event-draggable {
  padding-left: 6px;
}

.v-event-timed {
  user-select: none;
  -webkit-user-select: none;
}

.v-event-drag-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 4px;
  height: 4px;
  cursor: ns-resize;

  &::after {
    display: none;
    position: absolute;
    left: 50%;
    height: 4px;
    border-top: 1px solid white;
    border-bottom: 1px solid white;
    width: 16px;
    margin-left: -8px;
    opacity: 0.8;
    content: '';
  }

  &:hover::after {
    display: block;
  }
}
</style>