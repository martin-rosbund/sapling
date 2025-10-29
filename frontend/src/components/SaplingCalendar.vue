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
              <v-card-title class="bg-primary text-white d-flex align-center justify-space-between">
                <div>
                  <v-icon left>{{ entity?.icon }}</v-icon> {{ $t(`navigation.calendar`) }}
                </div>
                <v-btn-toggle
                  v-model="calendarType"
                  mandatory
                  color="white"
                  class="calendar-toggle"
                  density="comfortable">
                  <v-btn value="day">{{ $t('calendar.day') }}</v-btn>
                  <v-btn value="week">{{ $t('calendar.week') }}</v-btn>
                  <v-btn value="month">{{ $t('calendar.month') }}</v-btn>
                  <v-btn value="4day">{{ $t('calendar.4day') }}</v-btn>
                </v-btn-toggle>
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text class="pa-0 calendar-card-text sapling-calendar-card-text">
                <v-calendar
                  ref="calendar"
                  v-model="value"
                  color="primary"
                  class="sapling-calendar-vcalendar"
                  :event-color="(event) => getEventColor(event as any)"
                  :event-ripple="false"
                  :events="filteredEvents"
                  :type="calendarType"
                  @mousedown:time="startTime"
                  @mouseleave="cancelDrag"
                  @mousemove:time="mouseMove"
                  @mouseup:time="endDrag">
                </v-calendar>
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
                  :company-people="companyPeople"
                  :own-person="ownPerson"
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
  <EntityEditDialog
    v-if="showEditDialog && entityEvent && templates.length > 0"
    :model-value="showEditDialog"
    :mode="'edit'"
    :item="editEvent"
    :templates="templates"
    :entity="entityEvent"
    @update:modelValue="val => showEditDialog = val"
    @save="onEditDialogSave"
    @cancel="onEditDialogCancel"
    :showReference="true"/>
  </template>
</template>

<script setup lang="ts">
import '@/assets/styles/SaplingCalendar.css';
import EntityEditDialog from './dialog/EntityEditDialog.vue';
import { computed, watch } from 'vue'
import { VCalendar } from 'vuetify/labs/VCalendar';
import PersonCompanyFilter from './PersonCompanyFilter.vue';
import type { EntityItem, EventItem } from '@/entity/entity';
import type { PersonItem, CompanyItem } from '@/entity/entity';

interface CalendarEvent extends EventItem {
  start: number;
  end: number;
  timed: boolean;
  companies?: CompanyItem[];
}

import { onMounted, ref } from 'vue';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
import ApiGenericService from '../services/api.generic.service';
// ...existing code...
import TranslationService from '@/services/translation.service';
import { i18n } from '@/i18n';
import { DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants';
import type { EntityTemplate } from '@/entity/structure';
import ApiService from '@/services/api.service';

const translationService = ref(new TranslationService());
const isLoading = ref(true);

const companies = ref<CompanyItem[]>([]);
const people = ref<PersonItem[]>([]);
const companyPeople = ref<PersonItem[]>([]);
const ownPerson = ref<PersonItem | null>(null);
const peopleSearch = ref('');
const peoplePage = ref(1);
const peopleTotal = ref(0);
const companiesSearch = ref('');
const companiesPage = ref(1);
const companiesTotal = ref(0);
const selectedPeople = ref<number[]>([]);
const selectedCompanies = ref<number[]>([]);

const events = ref<EventItem[]>([]);
const entity = ref<EntityItem | null>(null);
const entityEvent = ref<EntityItem | null>(null);
const templates = ref<EntityTemplate[]>([]);
const value = ref<string>('');
const calendarType = ref<'4day' | 'month' | 'day' | 'week'>('week');
const createEvent = ref<CalendarEvent | null>(null);
const createStart = ref<number | null>(null);
const showEditDialog = ref(false);
const editEvent = ref<CalendarEvent | null>(null);

onMounted(async () => {
  try {
    // Lade eigene Person
    const currentPersonStore = useCurrentPersonStore();
    await currentPersonStore.fetchCurrentPerson();
    ownPerson.value = currentPersonStore.person;

    await Promise.all([
      loadPeople(),
      loadCompanies(),
      loadCalendarEntity(),
      loadEventEntity(),
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
      })(),
      (async () => {
        templates.value = await ApiService.findAll<EntityTemplate[]>('template/event');
      })()
    ]);

    // Firmenpersonen separat laden
    if (ownPerson.value && ownPerson.value.company && ownPerson.value.company.handle != null) {
      const filter = { company: ownPerson.value.company.handle };
      const res = await ApiGenericService.find<PersonItem>('person', { filter, limit: 1000 });
      companyPeople.value = res.data;
    } else {
      companyPeople.value = [];
    }

    // Eigene Person nur als Standard setzen, falls keine Auswahl vorhanden
    if (ownPerson.value && ownPerson.value.handle != null && selectedPeople.value.length === 0) {
      selectedPeople.value = [Number(ownPerson.value.handle)];
    }
  } catch (e) {
    console.error('Fehler beim Laden der Personen, Firmen oder Events:', e);
  }
});

watch(() => i18n.global.locale.value, async () => {
  await loadTranslations();
});

async function loadCalendarEntity() {
    entity.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { handle: 'calendar' }, limit: 1, page: 1 })).data[0] || null;
};

async function loadEventEntity() {
    entityEvent.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { handle: 'event' }, limit: 1, page: 1 })).data[0] || null;
};

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

async function loadTranslations() {
  isLoading.value = true;
  await translationService.value.prepare('navigation', 'calendar', 'global', 'event');
  isLoading.value = false;
}

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

function getEventColor(event: EventItem): string {
  // Nutze die Farbe aus eventType, fallback auf Standardfarbe
  if (event && typeof event.type === 'object' && event.type !== null && typeof event.type.color === 'string' && event.type.color) {
    return event.type.color;
  }
  return '#2196F3';
}

function cancelDrag() {
  // Reset the drag state
  createEvent.value = null;
  createStart.value = null;
}

function startTime(nativeEvent: Event, tms: { year: number; month: number; day: number; hour: number; minute: number }) {
  const mouse = toTime(tms);
  const rounded = roundTime(mouse);
  const participants = people.value.filter(p => selectedPeople.value.includes(Number(p.handle)));
  const companiesSelected = companies.value.filter(c => selectedCompanies.value.includes(Number(c.handle)));

  createStart.value = rounded;

  if(ownPerson.value === null) {
    return;
  }

  const newEvent: CalendarEvent = {
    start: rounded,
    end: rounded,
    timed: true,
    participants,
    companies: companiesSelected,
    startDate: new Date(rounded),
    endDate: new Date(rounded),
    creator: ownPerson.value
  };

  events.value.push(newEvent);
  createEvent.value = newEvent;
}

function mouseMove(nativeEvent: Event, tms: { year: number; month: number; day: number; hour: number; minute: number }) {
  if (!createEvent.value || createStart.value === null) return;
  const mouse = roundTime(toTime(tms), false);
  const min = Math.min(mouse, createStart.value);
  const max = Math.max(mouse, createStart.value);
  createEvent.value.start = min;
  createEvent.value.end = max;
}

function endDrag() {
  // Dialog öffnen, wenn ein neues Event erstellt wurde
  if (createEvent.value) {
    editEvent.value = { ...createEvent.value };
    showEditDialog.value = true;
  }
  createStart.value = null;
}

function onEditDialogSave(updatedEvent: CalendarEvent) {
  // Event aktualisieren und per API speichern
  async function saveEvent() {
    try {
      if (editEvent.value && (editEvent.value.handle === undefined || editEvent.value.handle === null)) {
        // Neues Event anlegen
        const saved = await ApiGenericService.create<EventItem>('event', updatedEvent);
        const idx = events.value.indexOf(editEvent.value);
        if (idx !== -1) {
          events.value[idx] = {
            ...updatedEvent,
            ...saved
          };
        }
        createEvent.value = null;
      } else if (editEvent.value && editEvent.value.handle !== undefined && editEvent.value.handle !== null) {
        // Bestehendes Event aktualisieren
        const primaryKeys = { handle: editEvent.value.handle };
        const saved = await ApiGenericService.update<EventItem>('event', primaryKeys, updatedEvent);
        const idx = events.value.findIndex(ev => ev.handle === editEvent.value!.handle);
        if (idx !== -1) {
          events.value[idx] = {
            ...updatedEvent,
            ...saved
          };
        }
      }
      showEditDialog.value = false;
      editEvent.value = null;
    } catch (e) {
      console.error('Fehler beim Speichern des Events:', e);
      // createEvent.value bleibt erhalten, falls Fehler
    }
  }
  saveEvent();
}

function onEditDialogCancel() {
  // Falls Event gerade erstellt wurde und abgebrochen wird, entferne es
  if (createEvent.value) {
    const i = events.value.indexOf(createEvent.value);
    if (i !== -1) {
      events.value.splice(i, 1);
    }
  }
  showEditDialog.value = false;
  editEvent.value = null;
}

function roundTime(time: number, down = true): number {
  const roundTo = 15 * 60 * 1000;
  return down
    ? time - (time % roundTo)
    : time + (roundTo - (time % roundTo));
}

function toTime(tms: { year: number; month: number; day: number; hour: number; minute: number }): number {
  return new Date(tms.year, tms.month - 1, tms.day, tms.hour, tms.minute).getTime();
}

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