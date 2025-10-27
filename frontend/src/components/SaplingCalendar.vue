<template>
  <v-skeleton-loader
      v-if="isLoading"
      elevation="12" 
      class="fill-height" 
      type="article, actions, table"/>
    <template v-else>
  <v-container class="fill-height pa-0 full-height-container sapling-calendar-container" fluid>

  <v-row class="fill-height sapling-calendar-row" no-gutters>
          <!-- Kalender -->
          <v-col cols="12" md="9" class="d-flex flex-column calendar-main-col sapling-calendar-main-col">
            <v-card flat class="rounded-0 calendar-main-card d-flex flex-column sapling-calendar-main-card">
              <v-card-title class="bg-primary text-white d-flex align-center justify-space-between calendar-title">
                <div>
                  <v-icon left>{{ entity?.icon }}</v-icon> {{ $t(`navigation.calendar`) }}
                </div>
                <v-btn-toggle
                  v-model="calendarType"
                  mandatory
                  color="white"
                  class="calendar-toggle"
                  density="comfortable"
                >
                  <v-btn value="day">{{ $t('calendar.day') }}</v-btn>
                  <v-btn value="week">{{ $t('calendar.week') }}</v-btn>
                  <v-btn value="month">{{ $t('calendar.month') }}</v-btn>
                  <v-btn value="4day">{{ $t('calendar.4day') }}</v-btn>
                </v-btn-toggle>
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-0 calendar-card-text sapling-calendar-card-text">
                <div class="sapling-calendar-scroll-area">
                  <v-sheet class="calendar-sheet sapling-calendar-sheet">
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
                      class="sapling-calendar-vcalendar"
                    >
                      <template v-slot:event="{ event, timed, eventSummary }">
                        <div class="v-event-draggable sapling-calendar-event-content">
                          <div class="sapling-calendar-event-header-row">
                            <span v-if="event.type && event.type.icon" class="sapling-calendar-event-icon">
                              <v-icon left small>{{ event.type.icon }}</v-icon>
                            </span>
                            <span v-if="event.startDate && event.endDate" class="sapling-calendar-event-time-top">
                              {{ formatEventTime(event.startDate, event.endDate) }}
                            </span>
                          </div>
                          <div class="sapling-calendar-event-title-row">
                            <span class="sapling-calendar-event-title">{{ event.title }}</span>
                          </div>
                          <div v-if="event.description" class="sapling-calendar-event-desc-multiline">
                            {{ event.description }}
                          </div>
                        </div>
                      </template>
                    </v-calendar>
                  </v-sheet>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <!-- Personen-/Firmenliste (Filter) -->
          <v-col cols="12" md="3" class="sideboard d-flex flex-column sapling-calendar-sideboard">
            <v-card class="sideboard-card rounded-0 d-flex flex-column sapling-calendar-sideboard-card" flat>
              <v-card-title class="bg-primary text-white">
                <v-icon left>mdi-account-group</v-icon> {{ $t('navigation.person') + ' & ' + $t('navigation.company') }}
              </v-card-title>
              <v-divider></v-divider>
              <div class="sideboard-list-scroll d-flex flex-column sapling-calendar-sideboard-list-scroll">
                <PersonCompanyFilter
                  :people="people"
                  :companies="companies"
                  :people-total="peopleTotal"
                  :people-search="peopleSearch"
                  :people-page="peoplePage"
                  :people-page-size="DEFAULT_PAGE_SIZE_SMALL"
                  :companies-total="companiesTotal"
                  :companies-search="companiesSearch"
                  :companies-page="companiesPage"
                  :companies-page-size="DEFAULT_PAGE_SIZE_SMALL"
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
</template>

<script setup lang="ts">
import '@/assets/styles/SaplingCalendar.css';
import { computed, watch } from 'vue'
import { VCalendar } from 'vuetify/labs/VCalendar';
import PersonCompanyFilter from './PersonCompanyFilter.vue';
import type { EntityItem, EventItem } from '@/entity/entity';
import { onMounted, ref } from 'vue';
import ApiGenericService from '../services/api.generic.service';
import type { PersonItem } from '@/entity/entity';
import type { CompanyItem } from '@/entity/entity';
import TranslationService from '@/services/translation.service';
import { i18n } from '@/i18n';
import { DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants';

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

// Translation service instance (reactive)
const translationService = ref(new TranslationService());

// Loading state for async operations
const isLoading = ref(true);

// Filter-States
const selectedPeople = ref<number[]>([]);
const selectedCompanies = ref<number[]>([]);
const entity = ref<EntityItem | null>(null);

/**
 * Loads the entity definition.
 */
async function loadEntity() {
    entity.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { handle: 'calendar' }, limit: 1, page: 1 })).data[0] || null;
};

// Personen/Firmen initial paginiert laden
async function loadPeople(search = '', page = 1) {
  const filter = search ? { $or: [
    { firstName: { $like: `%${search}%` } },
    { lastName: { $like: `%${search}%` } },
    { email: { $like: `%${search}%` } }
  ] } : {};
  const res = await ApiGenericService.find<PersonItem>('person', {filter, page, limit: DEFAULT_PAGE_SIZE_SMALL});
  people.value = res.data;
  peopleTotal.value = res.meta?.total || 0;
}

async function loadCompanies(search = '', page = 1) {
  const filter = search ? { name: { $like: `%${search}%` } } : {};
  const res = await ApiGenericService.find<CompanyItem>('company', {filter, page, limit: DEFAULT_PAGE_SIZE_SMALL});
  companies.value = res.data;
  companiesTotal.value = res.meta?.total || 0;
}

onMounted(async () => {
  try {
    await Promise.all([
      loadPeople(),
      loadCompanies(),
      loadEntity(),
      loadTranslations(),
      (async () => {
        const eventRes = await ApiGenericService.find<EventItem>('event', {relations: ['participants', 'm:1']});
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
    // Standardmäßig erste Person auswählen, falls vorhanden
    const first = people.value[0];
    if (first && first.handle != null) {
      selectedPeople.value = [Number(first.handle)];
    } else {
      selectedPeople.value = [];
    }
  } catch (e) {
    console.error('Fehler beim Laden der Personen, Firmen oder Events:', e);
  }
});

// Watch for language changes and reload translations
watch(() => i18n.global.locale.value, async () => {
  await loadTranslations();
});

/**
 * Prepare translations for navigation and group labels.
 */
async function loadTranslations() {
  isLoading.value = true;
  await translationService.value.prepare('navigation', 'calendar', 'global');
  isLoading.value = false;
}

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
  // Wenn keine Person und keine Firma selektiert ist, keine Events anzeigen
  if (selectedPeople.value.length === 0 && selectedCompanies.value.length === 0) {
    return [];
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
function getEventColor(event: EventItem): string {
  // Nutze die Farbe aus eventType, fallback auf Standardfarbe
  if (event && event.type && typeof event.type.color === 'string' && event.type.color) {
    return event.type.color;
  }
  return '#2196F3';
}

// Drag-&-Drop-Logik für das Anlegen von Events
const createEvent = ref<any | null>(null);
const createStart = ref<number | null>(null);

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
  const defaultIcon = 'mdi-calendar'; // Standard-Icon für neue Events
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
    type: { handle: null, title: '', icon: defaultIcon, color, createdAt: now },
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

// Hilfsfunktion für Zeitformatierung (z.B. 09:00 - 10:30)
function formatEventTime(start: Date | string, end: Date | string): string {
  const s = typeof start === 'string' ? new Date(start) : start;
  const e = typeof end === 'string' ? new Date(end) : end;
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const fmt = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${fmt(s)} - ${fmt(e)}`;
}
</script>