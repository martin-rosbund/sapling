<template>
  <v-skeleton-loader
      v-if="isLoading"
      elevation="12" 
      class="fill-height glass-panel" 
      type="article, actions, table"/>
    <template v-else>
    <v-container class="fill-height pa-0 full-height-container sapling-event-container" fluid>
      <v-row class="fill-height sapling-event-row" no-gutters>
          <!-- Kalender -->
        <v-col cols="12" md="10" class="d-flex flex-column calendar-main-col sapling-event-main-col">
            <v-card flat class="rounded-0 calendar-main-card d-flex flex-column sapling-event-main-card transparent">
              <v-card-title class="d-flex align-center justify-space-between">
                <div>
                  <v-icon left>{{ entityCalendar?.icon }}</v-icon> {{ $t(`navigation.calendar`) }}
                </div>
                <v-btn-toggle
                  v-model="calendarType"
                  class="calendar-toggle" style="height: 30px;"
                  density="comfortable">
                  <v-btn class="glass-panel" size="x-small" value="day">{{ $t('calendar.day') }}</v-btn>
                  <v-btn class="glass-panel" size="x-small" value="workweek">{{ $t('calendar.workweek') }}</v-btn>
                  <v-btn class="glass-panel" size="x-small" value="week">{{ $t('calendar.week') }}</v-btn>
                  <v-btn class="glass-panel" size="x-small" value="month">{{ $t('calendar.month') }}</v-btn>
                </v-btn-toggle>
              </v-card-title>
              <v-divider></v-divider>
              <v-card-text ref="calendarScrollContainer" class="pa-0 calendar-card-text sapling-event-card-text">
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
                @mouseup:time="endDrag">
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
              </v-card-text>
            </v-card>
        </v-col>
          <!-- Personen-/Firmenliste (Filter) -->
        <v-col cols="12" md="2" class="sideboard d-flex flex-column sapling-event-sideboard">
            <v-card class="sideboard-card rounded-0 d-flex flex-column sapling-event-sideboard-card transparent" flat>
              <v-card-title>
                <v-icon left>mdi-account-group</v-icon> {{ $t('navigation.person') + ' & ' + $t('navigation.company') }}
              </v-card-title>
              <v-divider></v-divider>
              <div class="sideboard-list-scroll d-flex flex-column sapling-event-sideboard-list-scroll">
                <SaplingWorkFilter @update:selectedPeoples="onSelectedPeoplesUpdate" />
              </div>
            </v-card>
        </v-col>
      </v-row>
    </v-container>
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
import type { WorkHourItem } from '@/entity/entity';
// #endregion

// #region Composable
const {
  nowY,
  events,
  isLoading,
  templates,
  calendarType,
  entityCalendar,
  entityEvent,
  editEvent,
  showEditDialog,
  value,
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
  workHours,
} = useSaplingEvent();

onMounted(() => {
  nextTick(() => {
    scrollToCurrentTime();
  });
});
// #endregion

function getWorkHourStyle(date: string) {
  if (!workHours?.value) return {};
  const day = new Date(date).getDay();
  let weekDay: WorkHourItem | null = null;

  switch (day) {
    case 0:
      weekDay = workHours.value.sunday as WorkHourItem;
      break;
    case 1:
      weekDay = workHours.value.monday as WorkHourItem;
      break;
    case 2:
      weekDay = workHours.value.tuesday as WorkHourItem;
      break;
    case 3:
      weekDay = workHours.value.wednesday as WorkHourItem;
      break;
    case 4:
      weekDay = workHours.value.thursday as WorkHourItem;
      break;
    case 5:
      weekDay = workHours.value.friday as WorkHourItem;
      break;
    case 6:
      weekDay = workHours.value.saturday as WorkHourItem;
      break;
  }

  if (!weekDay || !weekDay.timeFrom || !weekDay.timeTo) return {};
  const [fromH = 0, fromM = 0] = weekDay.timeFrom.split(':').map(Number);
  const [toH = 0, toM = 0] = weekDay.timeTo.split(':').map(Number);
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
  } as CSSStyleDeclaration;
}
</script>