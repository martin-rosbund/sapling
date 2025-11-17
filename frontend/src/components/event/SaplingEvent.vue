<template>
  <v-skeleton-loader
      v-if="isLoading"
      elevation="12" 
      class="fill-height" 
      type="article, actions, table"/>
    <template v-else>
    <v-container class="fill-height pa-0 full-height-container sapling-event-container" fluid>
      <v-row class="fill-height sapling-event-row" no-gutters>
          <!-- Kalender -->
        <v-col cols="12" md="9" class="d-flex flex-column calendar-main-col sapling-event-main-col">
            <v-card flat class="rounded-0 calendar-main-card d-flex flex-column sapling-event-main-card">
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
              <v-card-text ref="calendarScrollContainer" class="pa-0 calendar-card-text sapling-event-card-text">
                <v-calendar
                ref="calendar"
                v-model="value"
                class="sapling-event-vcalendar"
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
                <template v-slot:day-body="{ date, week }">
                  <div
                    v-if="workHours && ['day', 'week', '4day'].includes(calendarType)"
                    class="workhour-bg"
                    :style="getWorkHourStyle(date)"
                  ></div>
                  <div
                    :class="{ first: date === week?.[0]?.date }"
                    :style="{ top: nowY() }"
                    class="v-current-time"
                  ></div>
                </template>
                    <template v-slot:event="{ event, eventSummary }">
                        <div class="v-event-draggable" style="display: flex; flex-direction: column; align-items: stretch; gap: 4px; height: 100%;">
                          <div style="display: flex; align-items: center; gap: 4px;">
                            <v-icon small>{{ event.event?.type?.icon ? event.event.type.icon : 'mdi-calendar-edit' }}</v-icon>
                            <component :is="eventSummary"></component>
                          </div>
                          <div style="flex: 1 1 auto; overflow: hidden; white-space: normal; word-break: break-word; padding: 2px;">
                            {{ event.event?.description }}
                          </div>
                        </div>
                        <div
                          class="v-event-drag-bottom"
                          @mousedown.stop="extendBottom(event)"
                          style="position: absolute; right: 2px; bottom: 2px; z-index: 2; cursor: se-resize;">
                          <v-icon small>mdi-resize-bottom-right</v-icon>
                        </div>
                    </template>
                </v-calendar>
              </v-card-text>
            </v-card>
        </v-col>
          <!-- Personen-/Firmenliste (Filter) -->
        <v-col cols="12" md="3" class="sideboard d-flex flex-column sapling-event-sideboard">
            <v-card class="sideboard-card rounded-0 d-flex flex-column sapling-event-sideboard-card" flat>
              <v-card-title class="bg-primary text-white">
                <v-icon left>mdi-account-group</v-icon> {{ $t('navigation.person') + ' & ' + $t('navigation.company') }}
              </v-card-title>
              <v-divider></v-divider>
              <div class="sideboard-list-scroll d-flex flex-column sapling-event-sideboard-list-scroll">
                <SaplingWorkFilter
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
  <SaplingEdit
    v-if="showEditDialog && entityEvent && templates.length > 0 && editEvent"
    :model-value="showEditDialog"
    :mode="'edit'"
    :item="editEvent.event"
    :templates="templates"
    :entity="entityEvent"
    @update:modelValue="val => showEditDialog = val"
    @save="onEditDialogSave"
    @cancel="onEditDialogCancel"
    :showReference="true"/>
  </template>
</template>

<script lang="ts" setup>

// #region Imports
import '@/assets/styles/SaplingCalendar.css';
import { useSaplingEvent } from '@/composables/event/useSaplingEvent';
import SaplingEdit from '../dialog/SaplingEdit.vue';
import SaplingWorkFilter from '../filter/SaplingWorkFilter.vue';
import { VCalendar } from 'vuetify/labs/VCalendar'; // Vuetify calendar
// #endregion

// #region Composable
import { DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants';
const {
  calendar,
  nowY,
  ownPerson,
  events,
  isLoading,
  peoples,
  companies,
  companyPeoples,
  templates,
  selectedPeoples,
  selectedCompanies,
  companiesSearch,
  peopleSearch,
  calendarType,
  entityCalendar,
  entityEvent,
  editEvent,
  showEditDialog,
  value,
  getEvents,
  togglePerson,
  toggleCompany,
  startDrag,
  startTime,
  extendBottom,
  mouseMove,
  endDrag,
  cancelDrag,
  getEventColor,
  onPeopleSearch,
  onCompaniesSearch,
  onPeoplePage,
  onCompaniesPage,
  onEditDialogSave,
  onEditDialogCancel,
  scrollToCurrentTime,
  workHours,
} = useSaplingEvent();
import { onMounted, nextTick, ref } from 'vue';

const calendarScrollContainer = ref(null);

// Scroll to current time after mount and when calendarType or value changes
onMounted(() => {
  nextTick(() => {
    scrollToCurrentTime();
  });
});
// #endregion

function getWorkHourStyle(date: string) {
  if (!workHours?.value) return {};
  const day = new Date(date).getDay(); // 0=So, 1=Mo, ...
  const dayMap = [
    'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
  ];
  const wh = (workHours.value as Record<string, any>)[dayMap[day]];
  if (!wh || !wh.timeFrom || !wh.timeTo) return {};
  const [fromH, fromM] = wh.timeFrom.split(':').map(Number);
  const [toH, toM] = wh.timeTo.split(':').map(Number);
  const fromMin = fromH * 60 + fromM;
  const toMin = toH * 60 + toM;
  const top = (fromMin / (24 * 60)) * 100;
  const height = ((toMin - fromMin) / (24 * 60)) * 100;
  return {
    position: 'absolute',
    left: '0px',
    right: '0px',
    top: top + '%',
    height: height + '%',
    background: 'rgba(100,180,255,0.15)',
    zIndex: '0',
    pointerEvents: 'none'
  } as any;
}
</script>