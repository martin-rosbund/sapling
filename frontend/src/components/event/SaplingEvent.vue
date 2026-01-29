<template>
  <v-skeleton-loader
      v-if="isLoading"
      elevation="12" 
      class="fill-height glass-panel" 
      type="article, actions, table"/>
    <template v-else>
      <v-row class="fill-height sapling-event-row pr-10" no-gutters>
          <!-- Kalender -->
        <v-col cols="12" md="12" class="d-flex flex-column calendar-main-col sapling-event-main-col">
            <v-card flat class="rounded-0 calendar-main-card d-flex flex-column sapling-event-main-card transparent">
                  <v-card-title class="d-flex align-center justify-space-between">
                    <div class="d-flex flex-column align-start" style="min-height: 54px; justify-content: center;">
                      <div class="d-flex align-center mb-1">
                        <v-icon left>{{ entityEvent?.icon }}</v-icon>
                        <span class="ml-1">{{ $t(`navigation.calendar`) }}</span>
                      </div>
                      <span v-if="currentMonthLabel" class="ml-9 text-caption" style="font-size: 1.1em; font-weight: 500;">{{ currentMonthLabel }}</span>
                    </div>
                    <!-- Navigation and view selection -->
                    <div class="d-flex align-center">
                      <!-- View mode toggle -->
                      <v-btn-toggle
                        v-if="!isNarrowScreen"
                        v-model="calendarViewMode"
                        class="calendar-view-toggle mr-3"
                        style="height: 30px;"
                        density="comfortable"
                        mandatory
                      >
                        <v-btn class="glass-panel" size="x-small" value="single">{{$t('calendar.combined')}}</v-btn>
                        <v-btn class="glass-panel" size="x-small" value="sidebyside">{{$t('calendar.sideBySide')}}</v-btn>
                      </v-btn-toggle>
                      <v-btn-group style="height: 30px;" class="mr-3">
                        <v-btn icon size="x-small" class="glass-panel" @click="goToPrevious">
                          <v-icon>mdi-chevron-left</v-icon>
                        </v-btn>
                        <v-btn size="x-small" class="glass-panel" @click="goToToday">
                          {{ $t('event.today') }}
                        </v-btn>
                        <v-btn icon size="x-small" class="glass-panel" @click="goToNext">
                          <v-icon>mdi-chevron-right</v-icon>
                        </v-btn>
                      </v-btn-group>
                      <div class="d-none d-md-flex">
                        <v-btn-toggle
                          v-model="calendarType"
                          class="calendar-toggle" style="height: 30px;"
                          density="comfortable">
                          <v-btn class="glass-panel" size="x-small" value="day">{{ $t('calendar.day') }}</v-btn>
                          <v-btn class="glass-panel" size="x-small" value="workweek">{{ $t('calendar.workweek') }}</v-btn>
                          <v-btn class="glass-panel" size="x-small" value="week">{{ $t('calendar.week') }}</v-btn>
                          <v-btn class="glass-panel" size="x-small" value="month">{{ $t('calendar.month') }}</v-btn>
                        </v-btn-toggle>
                      </div>
                      <div class="d-flex d-md-none">
                        <v-menu offset-y>
                          <template v-slot:activator="{ props }">
                            <v-btn-group style="height: 30px;">
                              <v-btn v-bind="props" icon="mdi-dots-horizontal" size="x-small" class="transparent"/>
                            </v-btn-group>
                          </template>
                          <v-list class="glass-panel">
                            <v-list-item v-for="type in [
                              { value: 'day', label: $t('calendar.day') },
                              { value: 'workweek', label: $t('calendar.workweek') },
                              { value: 'week', label: $t('calendar.week') },
                              { value: 'month', label: $t('calendar.month') }
                            ]" :key="type.value" @click="calendarType = type.value as typeof calendarType">
                              <v-list-item-title>{{ type.label }}</v-list-item-title>
                            </v-list-item>
                          </v-list>
                        </v-menu>
                      </div>
                    </div>
                  </v-card-title>
              <v-divider></v-divider>
              <v-card-text ref="calendarScrollContainer" class="pa-0 calendar-card-text sapling-event-card-text" style="display: flex; flex-direction: row; width: 100%; overflow-x: auto;">
                <template v-if="calendarViewMode === 'single'">
                  <v-calendar
                    ref="calendar"
                    v-model="value"
                    class="sapling-event-vcalendar glass-panel"
                    color="primary"
                    :event-color="getEventColor"
                    :event-ripple="false"
                    :events="events"
                    :type="calendarType === 'workweek' ? 'week' : calendarType"
                    :weekdays="calendarType === 'workweek' ? [1,2,3,4,5] : undefined"
                    @change="getEvents"
                    @mousedown:event="startDrag"
                    @mousedown:time="startTime"
                    @mouseleave="cancelDrag"
                    @mousemove:time="mouseMove"
                    @mouseup:time="endDrag"
                    style="flex: 1 1 100%; min-width: 600px; max-width: 100%;"
                  >
                    <template v-slot:day-body="{ date, week }">
                      <div
                        v-if="workHours && ['day', 'week', 'workweek'].includes(calendarType)"
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
                      <div class="v-event-draggable" style="display: flex; flex-direction: column; align-items: stretch; gap: 4px; height: 100%; position: relative;">
                        <div :style="{ position: 'absolute', left: '0', top: '0', bottom: '0', width: '24px', background: event?.event?.status?.color }"></div>
                        <div style="display: flex; align-items: center; gap: 4px; margin-left: 2px;">
                          <v-icon small>{{ event.event?.type?.icon ? event.event.type.icon : 'mdi-calendar-edit' }}</v-icon>
                          <component style="margin-left: 3px;" :is="eventSummary"></component>
                        </div>
                        <div style="flex: 1 1 auto; overflow: hidden; white-space: normal; word-break: break-word; padding: 2px; margin-left: 24px;">
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
                </template>
                <template v-else>
                  <div style="width: 100%; min-width: 600px; overflow-x: auto;">
                    <div style="display: flex; flex-direction: row; width: 100%; min-width: 600px;">
                      <div v-for="personId in selectedPeoples" :key="personId" style="flex: 1 1 0; min-width: 400px; max-width: 100%; margin-right: 8px; display: flex; flex-direction: column;">
                        <div style="font-weight: 600; font-size: 1.1em; margin-bottom: 4px; padding-left: 8px;">{{ getPersonName(personId) }}</div>
                        <div style="flex: 1 1 auto; display: flex; flex-direction: column;">
                          <v-calendar
                            :ref="'calendar-' + personId"
                            v-model="value"
                            class="sapling-event-vcalendar glass-panel"
                            color="primary"
                            :event-color="getEventColor"
                            :event-ripple="false"
                            :events="getEventsForPerson(personId).concat(
                              calendarViewMode === 'sidebyside' && createEvent && (
                                (createEvent.event && Array.isArray(createEvent.event.participants) && createEvent.event.participants.includes(personId)) ||
                                (!createEvent.event || !Array.isArray(createEvent.event.participants))
                              )
                                ? [{
                                    ...createEvent,
                                    event: {
                                      ...(createEvent.event || {}),
                                      participants: [personId],
                                    }
                                  }]
                                : []
                            )"
                            :type="calendarType === 'workweek' ? 'week' : calendarType"
                            :weekdays="calendarType === 'workweek' ? [1,2,3,4,5] : undefined"
                            @change="getEvents"
                            @mousedown:event="startDrag"
                            @mousedown:time="startTime"
                            @mouseleave="cancelDrag"
                            @mousemove:time="mouseMove"
                            @mouseup:time="endDrag"
                            style="min-width: 400px; max-width: 100%; height: 100%;"
                          >
                            <template v-slot:day-body="{ date, week }">
                              <div
                                v-if="workHours && ['day', 'week', 'workweek'].includes(calendarType)"
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
                              <div class="v-event-draggable" style="display: flex; flex-direction: column; align-items: stretch; gap: 4px; height: 100%; position: relative;">
                                <div :style="{ position: 'absolute', left: '0', top: '0', bottom: '0', width: '24px', background: event?.event?.status?.color }"></div>
                                <div style="display: flex; align-items: center; gap: 4px; margin-left: 2px;">
                                  <v-icon small>{{ event.event?.type?.icon ? event.event.type.icon : 'mdi-calendar-edit' }}</v-icon>
                                  <component style="margin-left: 3px;" :is="eventSummary"></component>
                                </div>
                                <div style="flex: 1 1 auto; overflow: hidden; white-space: normal; word-break: break-word; padding: 2px; margin-left: 24px;">
                                  {{ event.event?.description }}
                                </div>
                              </div>
                            </template>
                          </v-calendar>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </v-card-text>
            </v-card>
        </v-col>
      </v-row>
      <!-- Personen-/Firmenliste (Filter) Drawer -->
      <SaplingWorkFilter @update:selectedPeoples="onSelectedPeoplesUpdate" />
  <SaplingEdit
    v-if="showEditDialog && entityEvent && templates.length > 0 && editEvent"
    :model-value="showEditDialog"
    :mode="editEvent?.event?.handle ? 'edit' : 'create'"
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
import SaplingEdit from '@/components/dialog/SaplingEdit.vue';
import SaplingWorkFilter from '@/components/filter/SaplingWorkFilter.vue';
import { onMounted, nextTick } from 'vue';
import { ref } from 'vue';
// #endregion

// #region Composable
const calendarViewMode = ref('single');
const isNarrowScreen = ref(false);
const {
  nowY,
  events,
  isLoading,
  templates,
  calendarType,
  entityEvent,
  editEvent,
  showEditDialog,
  value,
  workHours,
  getEvents,
  startDrag,
  startTime,
  extendBottom,
  mouseMove,
  endDrag,
  cancelDrag,
  getEventColor,
  onEditDialogSave,
  onEditDialogCancel,
  scrollToCurrentTime,
  onSelectedPeoplesUpdate,
  getWorkHourStyle,
  goToPrevious,
  goToNext,
  selectedPeoples,
  getEventsForPerson,
  getPersonName,
  createEvent,
} = useSaplingEvent();

// Today button handler
function goToToday() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  value.value = `${yyyy}-${mm}-${dd}`;
}

import { computed } from 'vue';
import { i18n } from '@/i18n';

// Setze initial das aktuelle Datum, falls leer
if (!value.value) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  value.value = `${yyyy}-${mm}-${dd}`;
}

const monthNames = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

function getWeekNumber(date: Date) {
  // ISO week date weeks start on Monday
  // so correct the day number
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  return weekNum;
}

const currentMonthLabel = computed(() => {
  if (!value.value) return '';
  const date = new Date(value.value);
  const month = i18n.global.t(`event.${monthNames[date.getMonth()]}`);
  const kalendarWeek = i18n.global.t(`event.kalendarWeek`);
  if (isNaN(date.getTime())) return '';
  if (calendarType.value === 'month') {
    // Erster und letzter Tag des Monats
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const kwStart = getWeekNumber(firstDay);
    const kwEnd = getWeekNumber(lastDay);
    return `${month} ${date.getFullYear()} · ${kalendarWeek} ${kwStart}–${kwEnd}`;
  } else {
    const kw = getWeekNumber(date);
    return `${month} ${date.getFullYear()} · ${kalendarWeek} ${kw}`;
  }
});

function handleResize() {
  isNarrowScreen.value = window.innerWidth < DEFAULT_SMALL_WINDOW_WIDTH;
  if (isNarrowScreen.value) {
    calendarViewMode.value = 'single';
  }
}

onMounted(() => {
  handleResize();
  window.addEventListener('resize', handleResize);
  nextTick(() => {
    scrollToCurrentTime();
  });
});

import { onBeforeUnmount } from 'vue';
import { DEFAULT_SMALL_WINDOW_WIDTH } from '@/constants/project.constants';
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
});
// #endregion
</script>