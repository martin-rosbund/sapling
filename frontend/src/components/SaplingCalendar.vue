<template>
  <v-container class="fill-height pa-0" fluid>
    <v-row class="fill-height" no-gutters>
      <!-- Kalender -->
      <v-col cols="12" md="9" class="d-flex flex-column">
        <v-card flat class="rounded-0" style="height:100%;">
          <v-card-title class="bg-primary text-white d-flex align-center justify-space-between">
            <div>
              <v-icon left>mdi-calendar</v-icon> Ressourcen-Kalender
            </div>
            <v-btn-toggle
              v-model="calendarType"
              mandatory
              color="white"
              class="calendar-toggle"
              density="comfortable"
            >
              <v-btn value="day">Tag</v-btn>
              <v-btn value="week">Woche</v-btn>
              <v-btn value="month">Monat</v-btn>
              <v-btn value="4day">4 Tage</v-btn>
            </v-btn-toggle>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-0" style="overflow:auto;">
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
            <div>
              <div
                v-for="person in people"
                :key="'person-' + person.id"
                class="vertical-item"
                :class="{ 'selected': selectedPeople.includes(person.id) }"
                @click="togglePerson(person.id)"
                style="align-items: center;"
              >
                <v-avatar size="24" class="mr-1">
                  <img :src="person.avatar" />
                </v-avatar>
                <span style="flex:1">{{ person.name }}</span>
                <v-checkbox
                  v-model="selectedPeople"
                  :value="person.id"
                  hide-details
                  density="compact"
                  class="ml-1"
                  @click.stop
                  :ripple="false"
                  style="pointer-events: none;"
                ></v-checkbox>
              </div>
            </div>
            <v-divider class="my-2"></v-divider>
            <v-list-subheader>Firmen</v-list-subheader>
            <div>
              <div
                v-for="company in companies"
                :key="'company-' + company.id"
                class="vertical-item"
                :class="{ 'selected': selectedCompanies.includes(company.id) }"
                @click="toggleCompany(company.id)"
                style="align-items: center;"
              >
                <v-icon class="mr-1" size="24">mdi-domain</v-icon>
                <span style="flex:1">{{ company.name }}</span>
                <v-checkbox
                  v-model="selectedCompanies"
                  :value="company.id"
                  hide-details
                  density="compact"
                  class="ml-1"
                  @click.stop
                  :ripple="false"
                  style="pointer-events: none;"
                ></v-checkbox>
              </div>
            </div>
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
  personIds?: number[];    // NEU
  companyIds?: number[];   // NEU
  // personId?: number;     // ALT, kann entfernt werden
  // companyId?: number;    // ALT, kann entfernt werden
}

const events = ref<CalendarEvent[]>([
  {
    id: 1,
    name: 'Max: Daily Standup',
    color: '#2196F3',
    start: new Date('2025-10-22T09:00:00').getTime(),
    end: new Date('2025-10-22T09:30:00').getTime(),
    timed: true,
    personIds: [1],
  },
  {
    id: 2,
    name: 'Max: Kundentermin Acme',
    color: '#1976D2',
    start: new Date('2025-10-22T11:00:00').getTime(),
    end: new Date('2025-10-22T12:00:00').getTime(),
    timed: true,
    personIds: [1],
    companyIds: [1],
  },
  // Erika Musterfrau
  {
    id: 3,
    name: 'Erika: Projektbesprechung',
    color: '#4CAF50',
    start: new Date('2025-10-22T10:00:00').getTime(),
    end: new Date('2025-10-22T11:00:00').getTime(),
    timed: true,
    personIds: [2],
  },
  {
    id: 4,
    name: 'Erika: Beta AG Strategie',
    color: '#8BC34A',
    start: new Date('2025-10-23T14:00:00').getTime(),
    end: new Date('2025-10-23T15:00:00').getTime(),
    timed: true,
    personIds: [2],
    companyIds: [2],
  },
  // Acme GmbH (Firmenevent)
  {
    id: 5,
    name: 'Acme GmbH: Teammeeting',
    color: '#FF9800',
    start: new Date('2025-10-22T13:00:00').getTime(),
    end: new Date('2025-10-22T14:00:00').getTime(),
    timed: true,
    companyIds: [1],
  },
  // Beta AG (Firmenevent)
  {
    id: 6,
    name: 'Beta AG: Kundentermin',
    color: '#E91E63',
    start: new Date('2025-10-23T09:00:00').getTime(),
    end: new Date('2025-10-23T10:00:00').getTime(),
    timed: true,
    companyIds: [2],
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
const selectedPeople = ref<number[]>([people[0].id])
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
  if (selectedPeople.value.length === 0 && selectedCompanies.value.length === 0) {
    return events.value
  }
  return events.value.filter(ev => {
    if (createEvent.value && ev === createEvent.value) return true

    const personMatch = ev.personIds && ev.personIds.some(id => selectedPeople.value.includes(id))
    const companyMatch = ev.companyIds && ev.companyIds.some(id => selectedCompanies.value.includes(id))
    return personMatch || companyMatch
  })
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

    // Ein Event mit allen ausgewählten Personen und Firmen anlegen
    const newEvent: CalendarEvent = {
      id: Date.now() + Math.floor(Math.random() * 10000),
      name: `Event #${events.value.length}`,
      color: rndElement(colors),
      start: createStart.value!,
      end: createStart.value!,
      timed: true,
      personIds: [...selectedPeople.value],
      companyIds: [...selectedCompanies.value],
    }
    events.value.push(newEvent)
    createEvent.value = newEvent
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

    // Felder direkt am Objekt ändern, nicht ersetzen!
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
  // Keine Zufallsdaten mehr, Events bleiben wie initialisiert!
  // Diese Funktion kann leer bleiben oder entfernt werden.
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
.horizontal-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}
.horizontal-item {
  display: flex;
  align-items: center;
  border-radius: 18px;
  padding: 4px 10px 4px 4px;
  cursor: pointer;
  transition: background 0.2s;
}
.horizontal-item.selected {
  background: #e0e0e01a;
  border: 1px solid #1976d2;
}

.vertical-item {
  display: flex;
  align-items: center;
  border-radius: 18px;
  padding: 4px 10px 4px 4px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 8px;
}
.vertical-item.selected {
  background: #e0e0e01a;
  border: 1px solid #1976d2;
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