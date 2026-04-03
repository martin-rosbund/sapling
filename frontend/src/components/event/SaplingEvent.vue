<template>
  <v-skeleton-loader
    v-if="isLoading"
    elevation="12"
    class="fill-height glass-panel"
    type="article, actions, table"
  />
  <template v-else>
    <v-row class="fill-height sapling-event-row pr-10" density="compact">
      <!-- Main calendar area -->
      <v-col cols="12" md="12" class="d-flex flex-column calendar-main-col sapling-event-main-col">
        <v-card
          flat
          class="rounded-0 calendar-main-card d-flex flex-column sapling-event-main-card"
        >
          <v-card-title class="d-flex align-center justify-space-between">
            <div
              class="d-flex flex-column align-start"
              style="min-height: 54px; justify-content: center"
            >
              <div class="d-flex align-center mb-1">
                <v-icon left>{{ entityEvent?.icon }}</v-icon>
                <span class="ml-1">{{ $t(`navigation.calendar`) }}</span>
              </div>
              <span
                v-if="currentMonthLabel"
                class="ml-9 text-caption"
                style="font-size: 1.1em; font-weight: 500"
                >{{ currentMonthLabel }}</span
              >
            </div>
            <!-- Navigation and view selection -->
            <div class="d-flex align-center sapling-event-header-controls">
              <!-- View mode toggle -->
              <v-btn-toggle
                v-if="!isNarrowScreen"
                v-model="calendarViewMode"
                class="calendar-view-toggle mr-3"
                density="compact"
                mandatory
              >
                <v-btn variant="outlined" size="small" value="single">{{
                  $t('calendar.combined')
                }}</v-btn>
                <v-btn variant="outlined" size="small" value="sidebyside">{{
                  $t('calendar.sideBySide')
                }}</v-btn>
              </v-btn-toggle>
              <v-btn-group class="mr-3" density="compact">
                <v-btn size="x-small" variant="outlined" @click="goToPrevious">
                  <v-icon>mdi-chevron-left</v-icon>
                </v-btn>
                <v-btn size="x-small" variant="outlined" @click="goToToday">
                  {{ $t('event.today') }}
                </v-btn>
                <v-btn size="x-small" variant="outlined" @click="goToNext">
                  <v-icon>mdi-chevron-right</v-icon>
                </v-btn>
              </v-btn-group>
              <div class="d-none d-md-flex">
                <v-btn-toggle v-model="calendarType" class="calendar-toggle" density="compact">
                  <v-btn variant="outlined" size="small" value="day">{{
                    $t('calendar.day')
                  }}</v-btn>
                  <v-btn variant="outlined" size="small" value="workweek">{{
                    $t('calendar.workweek')
                  }}</v-btn>
                  <v-btn variant="outlined" size="small" value="week">{{
                    $t('calendar.week')
                  }}</v-btn>
                  <v-btn variant="outlined" size="small" value="month">{{
                    $t('calendar.month')
                  }}</v-btn>
                </v-btn-toggle>
              </div>
              <div class="d-flex d-md-none">
                <v-menu offset-y>
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" icon="mdi-dots-horizontal" variant="text" />
                  </template>
                  <v-list class="glass-panel">
                    <v-list-item
                      v-for="type in calendarTypeOptions"
                      :key="type"
                      @click="calendarType = type"
                    >
                      <v-list-item-title>{{ $t(`calendar.${type}`) }}</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>
            </div>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text
            ref="calendarScrollContainer"
            class="pa-0 calendar-card-text sapling-event-card-text"
            style="display: flex; flex-direction: row; width: 100%; overflow-x: auto"
          >
            <template v-if="calendarViewMode === 'single'">
              <SaplingEventCalendar
                v-model="value"
                :events="events"
                :calendar-display-type="calendarDisplayType"
                :calendar-weekdays="calendarWeekdays"
                :work-hours="workHours"
                :show-work-hour-background="showWorkHourBackground"
                :calendar-style="'flex: 1 1 100%; max-width: 100%'"
                :show-resize-handle="true"
                :get-work-hour-style="getWorkHourStyle"
                :get-event-color="getEventColor"
                :now-y="nowY"
                :get-events="getEvents"
                :start-drag="startDrag"
                :start-time="startTime"
                :cancel-drag="cancelDrag"
                :mouse-move="mouseMove"
                :end-drag="endDrag"
                :extend-bottom="extendBottom"
              />
            </template>
            <template v-else>
              <div style="width: 100%; min-width: 600px; overflow-x: auto">
                <div style="display: flex; flex-direction: row; width: 100%; min-width: 600px">
                  <div
                    v-for="personId in selectedPeoples"
                    :key="personId"
                    style="
                      flex: 1 1 0;
                      min-width: 400px;
                      max-width: 100%;
                      margin-right: 8px;
                      display: flex;
                      flex-direction: column;
                    "
                  >
                    <div style="font-weight: 600; font-size: 1.1em; padding-top: 8px; padding: 8px">
                      {{ getPersonName(personId) }}
                    </div>
                    <div style="flex: 1 1 auto; display: flex; flex-direction: column">
                      <SaplingEventCalendar
                        v-model="value"
                        :events="getSideBySideEvents(personId)"
                        :calendar-display-type="calendarDisplayType"
                        :calendar-weekdays="calendarWeekdays"
                        :work-hours="workHours"
                        :show-work-hour-background="showWorkHourBackground"
                        :calendar-style="'min-width: 400px; max-width: 100%; height: 100%'"
                        :get-work-hour-style="getWorkHourStyle"
                        :get-event-color="getEventColor"
                        :now-y="nowY"
                        :get-events="getEvents"
                        :start-drag="startDrag"
                        :start-time="startTime"
                        :cancel-drag="cancelDrag"
                        :mouse-move="mouseMove"
                        :end-drag="endDrag"
                        :extend-bottom="extendBottom"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- People/company filter drawer -->
    <SaplingFilterWork @update:selectedPeoples="onSelectedPeoplesUpdate" />

    <SaplingDialogEdit
      v-if="showEditDialog && entityEvent && templates.length > 0 && editEvent"
      :model-value="showEditDialog"
      :mode="editEvent?.event?.handle ? 'edit' : 'create'"
      :item="editEvent.event"
      :templates="templates"
      :entity="entityEvent"
      @update:modelValue="(val) => (showEditDialog = val)"
      @save="onEditDialogSave"
      @cancel="onEditDialogCancel"
      :showReference="true"
    />
  </template>
</template>

<script lang="ts" setup>
// #region Imports
import { useSaplingEvent } from '@/composables/event/useSaplingEvent'
import SaplingFilterWork from '@/components/filter/SaplingFilterWork.vue'
import SaplingEventCalendar from '@/components/event/SaplingEventCalendar.vue'
import SaplingDialogEdit from '../dialog/SaplingDialogEdit.vue'
// #endregion

// #region Composable
const {
  calendarDisplayType,
  calendarScrollContainer,
  calendarType,
  calendarTypeOptions,
  calendarViewMode,
  calendarWeekdays,
  currentMonthLabel,
  entityEvent,
  events,
  getEventColor,
  getEvents,
  getPersonName,
  getSideBySideEvents,
  getWorkHourStyle,
  goToNext,
  goToPrevious,
  goToToday,
  isLoading,
  isNarrowScreen,
  nowY,
  onEditDialogCancel,
  onEditDialogSave,
  onSelectedPeoplesUpdate,
  selectedPeoples,
  showEditDialog,
  showWorkHourBackground,
  startDrag,
  startTime,
  extendBottom,
  mouseMove,
  endDrag,
  cancelDrag,
  templates,
  editEvent,
  value,
  workHours,
} = useSaplingEvent()
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingCalendar.css"></style>
