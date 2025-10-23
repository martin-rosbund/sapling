<template>
  <v-container class="fill-height pa-0 full-height-container" fluid>
    <v-row class="fill-height" no-gutters style="height:100vh;min-height:0;width:100%;margin-left:0;margin-right:0;overflow:hidden;">
      <!-- Kalender -->
      <v-col cols="12" md="9" class="d-flex flex-column" style="height:100%;min-height:0;">
        <v-card flat class="rounded-0" style="height:100%;display:flex;flex-direction:column;min-height:0;">
          <v-card-title style="height: 49px;" class="bg-primary text-white d-flex align-center justify-space-between">
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
          <v-card-text class="pa-0" style="overflow:auto;flex:1 1 0;min-height:0;">
            <v-sheet height="100%" style="height:100%;min-height:0;display:flex;flex-direction:column;">
              <v-calendar
                ref="calendar"
                v-model="value"
                :event-color="(event) => getEventColor(event as any)"
                :event-ripple="false"
                :events="filteredEvents"
                color="primary"
                :type="calendarType"
                @mousedown:time="startTime"
                @mousemove:time="mouseMove"
                @mouseup:time="endDrag"
                @mouseleave="cancelDrag"
              >
                <template v-slot:event="{ event, timed, eventSummary }">
                  <div class="v-event-draggable">
                    <component :is="eventSummary"></component>
                  </div>
                </template>
              </v-calendar>
            </v-sheet>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Personen-/Firmenliste (Filter) -->
      <v-col cols="12" md="3" class="sideboard d-flex flex-column" style="padding-right:0;padding-left:0;height:100%;min-height:0;max-height:100vh;">
        <v-card class="sideboard-card rounded-0" flat style="height:100%;display:flex;flex-direction:column;min-height:0;">
          <v-card-title class="bg-primary text-white">
            <v-icon left>mdi-account-group</v-icon> {{ $t('navigation.person') + ' & ' + $t('navigation.company') }}
          </v-card-title>
          <v-divider></v-divider>
          <div class="sideboard-list-scroll" style="flex:1;min-height:0;max-height:100vh;">
            <PersonCompanyFilter
              :people="people"
              :companies="companies"
              :people-total="peopleTotal"
              :people-search="peopleSearch"
              :people-page="peoplePage"
              :people-page-size="5"
              :companies-total="companiesTotal"
              :companies-search="companiesSearch"
              :companies-page="companiesPage"
              :companies-page-size="5"
              :selectedPeople="selectedPeople"
              :selectedCompanies="selectedCompanies"
              @togglePerson="togglePerson"
              @toggleCompany="toggleCompany"
              @searchPeople="onPeopleSearch"
              @searchCompanies="onCompaniesSearch"
              @pagePeople="onPeoplePage"
              @pageCompanies="onCompaniesPage"
            />
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VCalendar } from 'vuetify/labs/VCalendar';
import PersonCompanyFilter from './PersonCompanyFilter.vue';
import type { EventItem } from '@/entity/entity';
import { onMounted, ref } from 'vue';
import ApiGenericService from '../services/api.generic.service';
import type { PersonItem } from '@/entity/entity';
import type { CompanyItem } from '@/entity/entity';

const companies = ref<CompanyItem[]>([]);
const people = ref<PersonItem[]>([]);
// Paging/Suche für Personen/Firmen
const peopleSearch = ref('');
const peoplePage = ref(1);
const peopleTotal = ref(0);
const companiesSearch = ref('');
const companiesPage = ref(1);
const companiesTotal = ref(0);
const events = ref<EventItem[]>([]);

// Filter-States
const selectedPeople = ref<number[]>([]);
const selectedCompanies = ref<number[]>([]);


// Personen/Firmen initial paginiert laden
async function loadPeople(search = '', page = 1) {
  const filter = search ? { $or: [
    { firstName: { $like: `%${search}%` } },
    { lastName: { $like: `%${search}%` } },
    { email: { $like: `%${search}%` } }
  ] } : {};
  const res = await ApiGenericService.find<PersonItem>('person', filter, {}, page, 5);
  people.value = res.data;
  peopleTotal.value = res.meta?.total || 0;
}
async function loadCompanies(search = '', page = 1) {
  const filter = search ? { name: { $like: `%${search}%` } } : {};
  const res = await ApiGenericService.find<CompanyItem>('company', filter, {}, page, 5);
  companies.value = res.data;
  companiesTotal.value = res.meta?.total || 0;
}

onMounted(async () => {
  try {
    await Promise.all([
      loadPeople(),
      loadCompanies(),
      (async () => {
        const eventRes = await ApiGenericService.find<EventItem>('event');
        // Events: startDate und endDate als Date-Objekte oder Timestamps
        events.value = (eventRes.data || []).map(ev => {
          const startDate = typeof ev.startDate === 'string' ? (ev.startDate as string).replace(/Z$/, '') : ev.startDate;
          const endDate = typeof ev.endDate === 'string' ? (ev.endDate as string).replace(/Z$/, '') : ev.endDate;
          return {
            ...ev,
            start: startDate ? new Date(startDate).getTime() : undefined,
            end: endDate ? new Date(endDate).getTime() : undefined,
            timed: ev.isAllDay === false
          };
        });
      })()
    ]);
    // Optional: Standardmäßig erste Person auswählen, falls vorhanden
    const first = people.value[0];
    if (first && first.handle != null) {
      selectedPeople.value = [Number(first.handle)];
    }
  } catch (e) {
    console.error('Fehler beim Laden der Personen, Firmen oder Events:', e);
  }
});

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

// Gefilterte Events basierend auf Teilnehmern und Firmenbezug
const filteredEvents = computed(() => {
  if (selectedPeople.value.length === 0 && selectedCompanies.value.length === 0) {
    return events.value;
  }
  return events.value.filter(ev => {
    // Personen-Filter: Teilnehmer oder Ersteller
    const participantHandles = Array.isArray(ev.participants)
      ? ev.participants.map(p => typeof p === 'object' && p !== null ? p.handle : undefined).filter(Boolean)
      : [];
    const creatorHandle = ev.creator?.handle;
    const personMatch = participantHandles.some(h => selectedPeople.value.includes(Number(h))) ||
      (creatorHandle != null && selectedPeople.value.includes(Number(creatorHandle)));

    // Firmen-Filter: Ticket mit Company-Bezug
    let companyMatch = false;
    if (
      ev.ticket &&
      typeof ev.ticket === 'object' &&
      'company' in ev.ticket &&
      ev.ticket.company &&
      typeof ev.ticket.company === 'object' &&
      'handle' in ev.ticket.company &&
      ev.ticket.company.handle != null
    ) {
      companyMatch = selectedCompanies.value.includes(Number(ev.ticket.company.handle));
    }

    return personMatch || companyMatch;
  });
});

// Kalender-Logik (Drag & Drop, Event-Erstellung etc.) ist entfernt, da Events jetzt vom Server geladen werden.
const value = ref<string>('');
const calendarType = ref<'4day' | 'month' | 'day' | 'week'>('week');

// Event-Farbe: Nutze EventType-Farbe, fallback auf Standard
function getEventColor(event: EventItem): string | undefined {
  if (event.type && event.type.color) {
    return event.type.color;
  }
  return '#2196F3';
}

// Drag-&-Drop-Logik für das Anlegen von Events
const dragEvent = ref<any | null>(null);
const dragTime = ref<number | null>(null);
const createEvent = ref<any | null>(null);
const createStart = ref<number | null>(null);
const extendOriginal = ref<number | null>(null);

function startTime(nativeEvent: Event, tms: any) {
  const mouse = toTime(tms);
  const rounded = roundTime(mouse);
  createStart.value = rounded;
  // Neues Event mit allen ausgewählten Personen und Firmen anlegen
  const now = new Date();
  const creator = people.value.find(p => selectedPeople.value.includes(Number(p.handle))) || people.value[0] || {
    handle: null,
    firstName: '',
    lastName: '',
    requirePasswordChange: null,
    isActive: null,
    createdAt: null
  };
  const color = '#2196F3'; // Standardfarbe für neue Events, falls keine Statusfarbe
  const newEvent = {
    handle: null,
    start: rounded,
    end: rounded,
    name: `Event #${events.value.length + 1}`,
    color,
    timed: true,
    participants: people.value.filter(p => selectedPeople.value.includes(Number(p.handle))),
    companies: companies.value.filter(c => selectedCompanies.value.includes(Number(c.handle))),
    title: `Event #${events.value.length + 1}`,
    startDate: new Date(rounded),
    endDate: new Date(rounded),
    isAllDay: false,
    creator,
    type: { handle: null, title: '', icon: null, color, createdAt: now },
    createdAt: now,
    updatedAt: now
  };
  events.value.push(newEvent);
  createEvent.value = newEvent;
}

function mouseMove(nativeEvent: Event, tms: any) {
  if (!createEvent.value || createStart.value === null) return;
  const mouse = roundTime(toTime(tms), false);
  const min = Math.min(mouse, createStart.value);
  const max = Math.max(mouse, createStart.value);
  createEvent.value.start = min;
  createEvent.value.end = max;
}

function endDrag() {
  createEvent.value = null;
  createStart.value = null;
}

function cancelDrag() {
  if (createEvent.value) {
    // Wenn das Event nicht gezogen wurde, entferne es wieder
    const i = events.value.indexOf(createEvent.value);
    if (i !== -1) {
      events.value.splice(i, 1);
    }
  }
  createEvent.value = null;
  createStart.value = null;
}

function roundTime(time: number, down = true): number {
  const roundTo = 15 * 60 * 1000; // 15 Minuten
  return down
    ? time - (time % roundTo)
    : time + (roundTo - (time % roundTo));
}

function toTime(tms: any): number {
  return new Date(tms.year, tms.month - 1, tms.day, tms.hour, tms.minute).getTime();
}

// Callbacks für Suchfeld und Paging (müssen vor Template stehen)
function onPeopleSearch(val: string) {
  peopleSearch.value = val;
  peoplePage.value = 1;
  loadPeople(val, 1);
}
function onCompaniesSearch(val: string) {
  companiesSearch.value = val;
  companiesPage.value = 1;
  loadCompanies(val, 1);
}
function onPeoplePage(val: number) {
  peoplePage.value = val;
  loadPeople(peopleSearch.value, val);
}
function onCompaniesPage(val: number) {
  companiesPage.value = val;
  loadCompanies(companiesSearch.value, val);
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
  min-height: 0;
}

/* Volle Breite und volle Höhe für den Container erzwingen */
.full-height-container {
  width: 100% !important;
  max-width: 100% !important;
  height: 100vh !important;
  min-height: 0 !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.sideboard-list-scroll {
  flex: 1;
  min-height: 0;
  max-height: 100vh;
  overflow-y: auto;
  padding-bottom: 64px; /* Platz für Footer */
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
  transition: 0.2s;
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
  transition: 0.2s;
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