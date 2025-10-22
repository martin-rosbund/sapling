<template>
  <v-container class="fill-height pa-0" fluid>
    <v-row class="fill-height" no-gutters>
      <!-- Kalender -->
      <v-col cols="12" md="9" class="d-flex flex-column">
        <v-card flat class="rounded-0" style="height:100%;">
          <v-card-title class="bg-primary text-white">
            <v-icon left>mdi-calendar</v-icon> Ressourcen-Kalender
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-0" style="overflow:auto;">
            <v-btn-toggle
              v-model="calendarType"
              mandatory
              color="primary"
              class="ma-2"
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
                :events="filteredEvents"
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
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Personen-/Firmenliste (Filter) -->
      <v-col cols="12" md="3" class="sideboard d-flex flex-column" style="padding-right:0;padding-left:0;">
        <v-card class="sideboard-card rounded-0" flat>
          <v-card-title class="bg-primary text-white">
            <v-icon left>mdi-account-group</v-icon> Personen & Firmen
          </v-card-title>
          <v-divider></v-divider>
          <v-list dense>
            <v-list-subheader>Personen</v-list-subheader>
            <v-list-item
              v-for="person in people"
              :key="'person-' + person.id"
              :active="selectedPeople.includes(person.id)"
              @click="togglePerson(person.id)"
              class="favorite-item"
            >
              <v-avatar size="24" class="mr-2">
                <img :src="person.avatar" />
              </v-avatar>
              <div>{{ person.name }}</div>
              <v-spacer />
              <v-checkbox
                v-model="selectedPeople"
                :value="person.id"
                hide-details
                class="ml-2"
                @click.stop
              ></v-checkbox>
            </v-list-item>
            <v-divider class="my-1"></v-divider>
            <v-list-subheader>Firmen</v-list-subheader>
            <v-list-item
              v-for="company in companies"
              :key="'company-' + company.id"
              :active="selectedCompanies.includes(company.id)"
              @click="toggleCompany(company.id)"
              class="favorite-item"
            >
              <v-icon class="mr-2">mdi-domain</v-icon>
              <div>{{ company.name }}</div>
              <v-spacer />
              <v-checkbox
                v-model="selectedCompanies"
                :value="company.id"
                hide-details
                class="ml-2"
                @click.stop
              ></v-checkbox>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { VCalendar } from 'vuetify/labs/VCalendar';

// Dummy-Daten für Personen und Firmen
const people = [
  { id: 1, name: 'Max Mustermann', avatar: 'https://randomuser.me/api/portraits/men/1.jpg' },
  { id: 2, name: 'Erika Musterfrau', avatar: 'https://randomuser.me/api/portraits/women/2.jpg' },
]
const companies = [
  { id: 1, name: 'Acme GmbH' },
  { id: 2, name: 'Beta AG' },
]

// Dummy-Termine mit Zuordnung zu Personen und Firmen
interface CalendarEvent {
  id: number;
  name: string;
  color: string;
  start: number;
  end: number;
  timed: boolean;
  personId?: number;
  companyId?: number;
}

const events = ref<CalendarEvent[]>([
  {
    id: 1,
    name: 'Meeting mit Max',
    color: '#2196F3',
    start: new Date('2025-10-22T09:00:00').getTime(),
    end: new Date('2025-10-22T10:00:00').getTime(),
    timed: true,
    personId: 1,
    companyId: 1,
  },
  {
    id: 2,
    name: 'Projektbesprechung Erika',
    color: '#4CAF50',
    start: new Date('2025-10-22T11:00:00').getTime(),
    end: new Date('2025-10-22T12:00:00').getTime(),
    timed: true,
    personId: 2,
    companyId: 2,
  },
  {
    id: 3,
    name: 'Acme GmbH Strategie',
    color: '#FF9800',
    start: new Date('2025-10-23T14:00:00').getTime(),
    end: new Date('2025-10-23T15:00:00').getTime(),
    timed: true,
    companyId: 1,
  },
])

const names = [
  'Meeting mit Max',
  'Projektbesprechung Erika',
  'Acme GmbH Strategie',
  'Sprint Review',
  'Kundentermin',
  'Team-Call',
  'Support-Session',
  'Planungsgespräch'
];

const colors = [
  '#2196F3', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#8BC34A', '#FFC107'
]

// Filter-States
const selectedPeople = ref<number[]>([])
const selectedCompanies = ref<number[]>([])

// Mehrfachauswahl-Logik
function togglePerson(id: number) {
  const idx = selectedPeople.value.indexOf(id)
  if (idx === -1) selectedPeople.value.push(id)
  else selectedPeople.value.splice(idx, 1)
}
function toggleCompany(id: number) {
  const idx = selectedCompanies.value.indexOf(id)
  if (idx === -1) selectedCompanies.value.push(id)
  else selectedCompanies.value.splice(idx, 1)
}

// Gefilterte Events
const filteredEvents = computed(() => {
  // Wenn keine Filter aktiv, zeige alle Events
  if (selectedPeople.value.length === 0 && selectedCompanies.value.length === 0) {
    return events.value
  }
  return events.value.filter(ev =>
    (ev.personId && selectedPeople.value.includes(ev.personId)) ||
    (ev.companyId && selectedCompanies.value.includes(ev.companyId))
  )
})

// Kalender-Logik (wie bisher)
const value = ref<string>('')
const calendarType = ref<string>('4day')
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
function startTime (nativeEvent: Event, tms: any) {
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
function mouseMove (nativeEvent: Event, tms: any) {
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
function toTime (tms: any): number {
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
function getEvents ({ start, end }: { start: any, end: any }) {
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

<style scoped>
.sideboard {
  border-left: 1px solid #e0e0e0;
  margin-right: 0 !important;
  padding-right: 0 !important;
  right: 0;
}
.sideboard-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.favorite-item {
  cursor: pointer;
}
.v-list-item--active {
  background: #e0e0e01a !important;
}
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