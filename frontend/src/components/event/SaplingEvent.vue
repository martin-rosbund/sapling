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
                  <v-icon left>{{ entityCalendar?.icon }}</v-icon> {{ $t(`navigation.calendar`) }}
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
                class="sapling-calendar-vcalendar"
                color="primary"
                :event-color="getEventColor"
                :event-ripple="false"
                :events="events"
                :type="calendarType"
                @change="getEvents"
                @mousedown:event="startDrag"
                @mousedown:time="startTime"
                @mouseleave="cancelDrag"
                @mousemove:time="mouseMove"
                @mouseup:time="endDrag">
                    <template v-slot:event="{ event, timed, eventSummary }">
                        <div class="v-event-draggable">
                        <component :is="eventSummary"></component>
                        </div>
                        <div
                        v-if="timed"
                        class="v-event-drag-bottom"
                        @mousedown.stop="extendBottom(event)"
                        ></div>
                    </template>
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
                  :people="peoples?.data || []"
                  :companies="companies?.data || []"
                  :company-people="companyPeoples?.data || []"
                  :own-person="ownPerson"
                  :people-total="peoples?.meta.total || 0"
                  :people-search="peopleSearch"
                  :people-page="peoples?.meta.page || 1"
                  :people-page-size="DEFAULT_PAGE_SIZE_SMALL"
                  :companies-total="companies?.meta.total || 0"
                  :companies-search="companiesSearch"
                  :companies-page="companies?.meta.page || 1"
                  :companies-page-size="DEFAULT_PAGE_SIZE_SMALL"
                  :selectedPeople="selectedPeoples"
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

<script lang="ts" setup>
//#region Imports
import '@/assets/styles/SaplingCalendar.css';
import { DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants';
import type { CompanyItem, EntityItem, EventItem, PersonItem } from '@/entity/entity';
import type { EntityTemplate, PaginatedResponse } from '@/entity/structure';
import { i18n } from '@/i18n';
import ApiGenericService from '@/services/api.generic.service';
import TranslationService from '@/services/translation.service';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
import { onMounted, ref, watch } from 'vue'
import { VCalendar } from 'vuetify/labs/VCalendar';
import EntityEditDialog from '../dialog/EntityEditDialog.vue';
import PersonCompanyFilter from '../PersonCompanyFilter.vue';
import type { CalendarEvent } from 'vuetify/lib/labs/VCalendar/types.mjs';
import ApiService from '@/services/api.service';
//#endregion

//#region Interfaces
interface CalendarDatePair {
    start: CalendarDateItem,
    end: CalendarDateItem,
}
interface CalendarDateItem {
    date: string,
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
}
//#endregion

//#region Properties
const translationService = ref(new TranslationService());
const ownPerson = ref<PersonItem | null>(null);
const events = ref<CalendarEvent[]>([]);
const isLoading = ref(true);

const peoples = ref<PaginatedResponse<PersonItem>>();
const companies = ref<PaginatedResponse<CompanyItem>>();
const companyPeoples = ref<PaginatedResponse<PersonItem>>();
const templates = ref<EntityTemplate[]>([]);

const selectedPeoples = ref<number[]>([]);
const selectedCompanies = ref<number[]>([]);

const companiesSearch = ref('');
const peopleSearch = ref('');

const calendarType = ref<'4day' | 'month' | 'day' | 'week'>('week');
const entityCalendar = ref<EntityItem | null>(null);
const entityEvent = ref<EntityItem | null>(null);
const editEvent = ref<CalendarEvent | null>(null);

const calendarDateRange = ref<CalendarDatePair | null>();

const showEditDialog = ref(false);

const value = ref('')
const colors = [
    '#2196F3', '#3F51B5', '#673AB7', '#00BCD4', '#4CAF50', '#FF9800', '#757575',
]
const dragEvent = ref<CalendarEvent | null>(null)
const dragTime = ref<number | null>(null)
const createEvent = ref<CalendarEvent | null>(null)
const createStart = ref<number | null>(null)
const extendOriginal = ref<number | null>(null)
//#endregion

//#region Lifecycle
onMounted(async () => {
    const currentPersonStore = useCurrentPersonStore();
    await currentPersonStore.fetchCurrentPerson();
    ownPerson.value = currentPersonStore.person;
    selectedPeoples.value = [ownPerson.value?.handle || 0];
    await loadTranslations();
    loadCalendarEntity();
    loadEventEntity();
    loadPeople();
    loadCompanies();
    loadCompanyPeople();
    loadTemplates();
});

watch(() => i18n.global.locale.value, async () => {
    await loadTranslations();
});
//#endregion

//#region Events
function getEvents(value: CalendarDatePair) {
    calendarDateRange.value = value;

    const startDate = new Date(value.start.date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(value.end.date);
    endDate.setHours(23, 59, 59, 999);

    ApiGenericService.find<EventItem>('event', {
        relations: ['participants', 'm:1'],
        filter: { startDate: { "$lte": endDate.getTime() }, endDate: { "$gte": startDate.getTime() }, participants: selectedPeoples.value }
    }).then(response => {
        const fetchedEvents: EventItem[] = response.data;
        const newEvents: CalendarEvent[] = []
        fetchedEvents.forEach(event => {
            newEvents.push({
                name: event.title,
                color: event.type.color,
                start: new Date(event.startDate).getTime() || 0,
                end: new Date(event.endDate).getTime() || 0,
                timed: event.isAllDay == false,
                event
            })
        })
        events.value = newEvents
    })
}
//#endregion

//#region Translations
async function loadTranslations() {
  isLoading.value = true;
  await translationService.value.prepare('navigation', 'calendar', 'global', 'event');
  isLoading.value = false;
}
//#endregion

//#region Entity
async function loadTemplates() {
    templates.value = await ApiService.findAll<EntityTemplate[]>('template/event');
};

async function loadCalendarEntity() {
    entityCalendar.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { handle: 'calendar' }, limit: 1, page: 1 })).data[0] || null;
};

async function loadEventEntity() {
    entityEvent.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { handle: 'event' }, limit: 1, page: 1 })).data[0] || null;
};
//#endregion

//#region People and Company
async function loadPeople(search = '', page = 1) {
  const filter = search ? { $or: [
    { firstName: { $like: `%${search}%` } },
    { lastName: { $like: `%${search}%` } },
    { email: { $like: `%${search}%` } }
  ] } : {};
  peoples.value= await ApiGenericService.find<PersonItem>('person', {filter, page, limit: DEFAULT_PAGE_SIZE_SMALL});
}

async function loadCompanyPeople(page = 1) {
  const filter = { company: ownPerson.value?.company?.handle || 0 };
  companyPeoples.value= await ApiGenericService.find<PersonItem>('person', {filter, page, limit: DEFAULT_PAGE_SIZE_SMALL});
}
   

async function loadCompanies(search = '', page = 1) {
    const filter = search ? { name: { $like: `%${search}%` } } : {};
    companies.value = await ApiGenericService.find<CompanyItem>('company', {filter, page, limit: DEFAULT_PAGE_SIZE_SMALL});
}

function togglePerson(id: number) {
  const idx = selectedPeoples.value.indexOf(id)
  if (idx === -1) selectedPeoples.value.push(id)
  else selectedPeoples.value.splice(idx, 1)
}

function toggleCompany(id: number) {
  const idx = selectedCompanies.value.indexOf(id)
  if (idx === -1) selectedCompanies.value.push(id)
  else selectedCompanies.value.splice(idx, 1)
}
//#endregion

//#region Calendar
function startDrag (nativeEvent: Event, { event, timed }: { event: CalendarEvent, timed: boolean }) {
    if (event && timed) {
    dragEvent.value = event
    dragTime.value = null
    extendOriginal.value = null
    }
}

function startTime (nativeEvent: Event, tms: CalendarDateItem) {
    const mouse = toTime(tms)

    if (dragEvent.value && dragTime.value === null) {
        const start = dragEvent.value.start
        dragTime.value = mouse - start
    } else {
    createStart.value = roundTime(mouse)
    createEvent.value = {
        name: `Event #${events.value.length}`,
        color: rndElement(colors),
        start: createStart.value,
        end: createStart.value,
        timed: true,
    }
    events.value.push(createEvent.value)
    }
}

function extendBottom (event: CalendarEvent) {
    createEvent.value = event
    createStart.value = event.start
    extendOriginal.value = event.end
}

function mouseMove (nativeEvent: Event, tms: CalendarDateItem) {
    const mouse = toTime(tms)

    if (dragEvent.value && dragTime.value !== null) {
    const start = dragEvent.value.start
    const end = dragEvent.value.end
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
        if (extendOriginal.value) {
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

function roundTime (time: number, down: boolean = true) {
    const roundTo = 15 // minutes
    const roundDownTime = roundTo * 60 * 1000
    return down ? time - time % roundDownTime : time + (roundDownTime - (time % roundDownTime))
}

function toTime (tms: CalendarDateItem) {
    return new Date(tms.year, tms.month - 1, tms.day, tms.hour, tms.minute).getTime()
}

function getEventColor (event: CalendarEvent): string {
    const color = (event as CalendarEvent).color;
    const rgb = parseInt(color.substring(1), 16);
    const r = (rgb >> 16) & 0xFF;
    const g = (rgb >> 8) & 0xFF;
    const b = (rgb >> 0) & 0xFF;

    return event === dragEvent.value
    ? `rgba(${r}, ${g}, ${b}, 0.7)`
    : event === createEvent.value
        ? `rgba(${r}, ${g}, ${b}, 0.7)`
        : color;
}

function rnd (a: number, b: number) {
    return Math.floor((b - a + 1) * Math.random()) + a
}

function rndElement (arr: string[]) {
    return arr[rnd(0, arr.length - 1)]
}
//#endregion

//#region Events
function onPeopleSearch(val: string) {
    peopleSearch.value = val;

    if(peoples.value){
        peoples.value.meta.page = 1;
        loadPeople(val, peoples.value.meta.page);
    }
}

function onCompaniesSearch(val: string) {
    companiesSearch.value = val;
    if(companies.value){
        companies.value.meta.page = 1;
        loadCompanies(val, companies.value.meta.page);
  }
}

function onPeoplePage(page: number) {
    if(peoples.value){
        peoples.value.meta.page = page;
        loadPeople(peopleSearch.value, page);
    }
}

function onCompaniesPage(page: number) {
    if(companies.value){
        companies.value.meta.page = page;
        loadCompanies(companiesSearch.value, page);
  }
}
//#endregion

//#region Edit Dialog
function onEditDialogSave(updatedEvent: CalendarEvent) {
    
}

function onEditDialogCancel() {

}
//#endregion
</script>