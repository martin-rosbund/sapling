import { ref, watch, onMounted } from 'vue';
import { i18n } from '@/i18n';
import ApiGenericService from '@/services/api.generic.service';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
import { DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants';
import type { CompanyItem, EntityItem, EventItem, PersonItem } from '@/entity/entity';
import type { PaginatedResponse } from '@/entity/structure';
import type { CalendarEvent } from 'vuetify/lib/labs/VCalendar/types.mjs';
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader';
import { useTemplateLoader } from '../generic/useTemplateLoader';

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

export function useSaplingEvent() {
  // State
  const { translationService, isLoading, loadTranslations } = useTranslationLoader('navigation', 'calendar', 'global', 'event', 'eventStatus');
  const ownPerson = ref<PersonItem | null>(null);
  const events = ref<CalendarEvent[]>([]);
  const peoples = ref<PaginatedResponse<PersonItem>>();
  const companies = ref<PaginatedResponse<CompanyItem>>();
  const companyPeoples = ref<PaginatedResponse<PersonItem>>();
  const { templates, isLoading: isTemplateLoading, loadTemplates } = useTemplateLoader('event');
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
  const dragEvent = ref<CalendarEvent | null>(null);
  const dragTime = ref<number | null>(null);
  const createEvent = ref<CalendarEvent | null>(null);
  const createStart = ref<number | null>(null);
  const extendOriginal = ref<number | null>(null);
  const value = ref<string>('');

  // Lifecycle
  onMounted(async () => {
    await setOwnPerson();
    await loadTranslations();
    loadCalendarEntity();
    loadEventEntity();
    loadPeople();
    loadCompanies();
    loadCompanyPeople(ownPerson.value);
    loadTemplates();
  });
  // Translation reload handled by useTranslationLoader

  watch(selectedPeoples, () => {
    if (calendarDateRange.value) {
      getEvents(calendarDateRange.value);
    }
  }, { deep: true });

  // Events
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
      const newEvents: CalendarEvent[] = [];
      fetchedEvents.forEach(event => {
        newEvents.push({
          name: event.title,
          color: event.type.color,
          start: new Date(event.startDate).getTime() || 0,
          end: new Date(event.endDate).getTime() || 0,
          timed: event.isAllDay == false,
          event
        });
      });
      events.value = newEvents;
    });
  }

  // Entity
  // Templates werden jetzt über useTemplateLoader geladen
  async function loadCalendarEntity() {
    entityCalendar.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { handle: 'calendar' }, limit: 1, page: 1 })).data[0] || null;
  }
  async function loadEventEntity() {
    entityEvent.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { handle: 'event' }, limit: 1, page: 1 })).data[0] || null;
  }

  // People & Company
  async function setOwnPerson(){
    const currentPersonStore = useCurrentPersonStore();
    await currentPersonStore.fetchCurrentPerson();
    ownPerson.value = currentPersonStore.person;
    selectedPeoples.value = [ownPerson.value?.handle || 0];
  }
  async function loadPeople(search = '', page = 1) {
    const filter = search ? { $or: [
      { firstName: { $like: `%${search}%` } },
      { lastName: { $like: `%${search}%` } },
      { email: { $like: `%${search}%` } }
    ] } : {};
    peoples.value= await ApiGenericService.find<PersonItem>('person', {filter, page, limit: DEFAULT_PAGE_SIZE_SMALL});
  }
  async function loadCompanyPeople(person: PersonItem | null) {
    const filter = { company: person?.company?.handle || 0 };
    companyPeoples.value= await ApiGenericService.find<PersonItem>('person', {filter, limit: DEFAULT_PAGE_SIZE_SMALL});
  }
  async function loadPeopleByCompany() {
    const filter = { company: { $in: selectedCompanies.value } };
    const list = await ApiGenericService.find<PersonItem>('person', {filter, limit: DEFAULT_PAGE_SIZE_SMALL});
    selectedPeoples.value = list.data.map(person => person.handle).filter((handle): handle is number => handle !== null) || [];
  }
  async function loadCompanies(search = '', page = 1) {
    const filter = search ? { name: { $like: `%${search}%` } } : {};
    companies.value = await ApiGenericService.find<CompanyItem>('company', {filter, page, limit: DEFAULT_PAGE_SIZE_SMALL});
  }
  function togglePerson(handle: number) {
    const idx = selectedPeoples.value.indexOf(handle)
    if (idx === -1) selectedPeoples.value.push(handle)
    else selectedPeoples.value.splice(idx, 1)
  }
  function toggleCompany(handle: number) {
    const idx = selectedCompanies.value.indexOf(handle)
    if (idx === -1) selectedCompanies.value.push(handle)
    else selectedCompanies.value.splice(idx, 1)
    loadPeopleByCompany();
  }

  // Calendar
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
        name: `${i18n.global.t('calendar.newEvent')}`,
        color:'#2196F3',
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
    if(createEvent.value != null && (createEvent?.value?.event?.handle === undefined || createEvent?.value?.event?.handle === null)){
      editEvent.value = createEvent.value;
      editEvent.value.event = {
        title: createEvent.value.name,
        startDate: toUTCISOString(createEvent.value.start),
        endDate: toUTCISOString(createEvent.value.end),
        creator: ownPerson.value || null,
        participants: selectedPeoples.value
      }
      showEditDialog.value = true;
    } else {
      editEvent.value = dragEvent.value ?? createEvent.value;
      if(editEvent.value?.event){
        editEvent.value.event = {
          ...editEvent.value?.event,
          startDate: toUTCISOString(editEvent.value.start),
          endDate: toUTCISOString(editEvent.value.end),
        }
      }
      showEditDialog.value = true;
    }
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
    let color = (event as CalendarEvent).color;
    if (!color || typeof color !== 'string' || !color.startsWith('#') || color.length !== 7) {
      color = '#2196f3'; // default blue
    }
    const rgb = parseInt(color.substring(1), 16);
    const r = (rgb >> 16) & 0xFF;
    const g = (rgb >> 8) & 0xFF;
    const b = (rgb >> 0) & 0xFF;
    return event === dragEvent.value || event === createEvent.value
      ? `rgba(${r}, ${g}, ${b}, 0.7)`
      : color;
  }
  function toUTCISOString(timestamp: number) {
    const date = new Date(timestamp);
    return new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds()
    )).toISOString();
  }

  // Events
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

  // Edit Dialog
  async function onEditDialogSave(updatedEvent: CalendarEvent) {
    if (editEvent.value && (editEvent.value.event.handle === undefined || editEvent.value.event.handle === null)) {
      const saved = await ApiGenericService.create<EventItem>('event', updatedEvent);
      const idx = events.value.indexOf(editEvent.value);
      if (idx !== -1) {
        events.value[idx] = {
          ...updatedEvent,
          ...saved,
          start: new Date(saved.startDate).getTime() || 0,
          end: new Date(saved.endDate).getTime() || 0
        };
      }
      createEvent.value = null;
    } else if (editEvent.value) {
      const primaryKeys = { handle: editEvent.value.event.handle };
      const saved = await ApiGenericService.update<EventItem>('event', primaryKeys, updatedEvent);
      const idx = events.value.findIndex(ev => ev.handle === editEvent.value!.event.handle);
      if (idx !== -1) {
        events.value[idx] = {
          ...updatedEvent,
          ...saved,
          start: new Date(saved.startDate).getTime() || 0,
          end: new Date(saved.endDate).getTime() || 0
        };
      }
    }
    showEditDialog.value = false;
    editEvent.value = null;
    if (calendarDateRange.value) {
      getEvents(calendarDateRange.value);
    }
  }
  function onEditDialogCancel() {
    if (calendarDateRange.value) {
      getEvents(calendarDateRange.value);
    }
  }

  return {
    translationService,
    ownPerson,
    events,
    isLoading,
    peoples,
    companies,
    companyPeoples,
  templates,
  isTemplateLoading,
    selectedPeoples,
    selectedCompanies,
    companiesSearch,
    peopleSearch,
    calendarType,
    entityCalendar,
    entityEvent,
    editEvent,
    calendarDateRange,
    showEditDialog,
    dragEvent,
    dragTime,
    createEvent,
    createStart,
    extendOriginal,
    value,
    getEvents,
    loadTranslations,
    loadTemplates,
    loadCalendarEntity,
    loadEventEntity,
    setOwnPerson,
    loadPeople,
    loadCompanyPeople,
    loadPeopleByCompany,
    loadCompanies,
    togglePerson,
    toggleCompany,
    startDrag,
    startTime,
    extendBottom,
    mouseMove,
    endDrag,
    cancelDrag,
    roundTime,
    toTime,
    getEventColor,
    toUTCISOString,
    onPeopleSearch,
    onCompaniesSearch,
    onPeoplePage,
    onCompaniesPage,
    onEditDialogSave,
    onEditDialogCancel,
  };
}
