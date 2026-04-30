<template>
  <section
    v-bind="attrs"
    class="sapling-page-shell sapling-page-shell--uniform-inset sapling-event-page"
  >
    <template v-if="isLoading">
      <div class="sapling-event-skeleton">
        <section class="sapling-event-skeleton__hero glass-panel">
          <div class="sapling-event-skeleton__hero-copy">
            <v-skeleton-loader type="text, heading, paragraph" />
          </div>
          <div class="sapling-event-skeleton__hero-stats">
            <v-skeleton-loader
              v-for="index in 3"
              :key="index"
              class="sapling-event-skeleton__stat"
              type="article"
            />
          </div>
        </section>

        <section class="sapling-event-skeleton__workspace">
          <v-skeleton-loader
            class="sapling-event-skeleton__calendar glass-panel"
            type="table-heading, table-thead, table-row-divider@8"
          />
          <div class="sapling-event-skeleton__context">
            <v-skeleton-loader
              class="glass-panel sapling-event-skeleton__panel"
              type="list-item-three-line@3"
            />
            <v-skeleton-loader
              class="glass-panel sapling-event-skeleton__panel"
              type="list-item-three-line@4"
            />
            <v-skeleton-loader class="glass-panel sapling-event-skeleton__panel" type="article" />
          </div>
        </section>
      </div>
    </template>

    <template v-else>
      <SaplingPageHero
        class="sapling-event-hero"
        variant="calendar"
        :eyebrow="$t('navigation.calendar')"
        :title="currentMonthLabel"
        :subtitle="currentDateRangeLabel"
      >
        <template #title-prefix>
          <div class="sapling-event-hero__icon-wrap">
            <v-icon size="28">{{ entityEvent?.icon || 'mdi-calendar-month-outline' }}</v-icon>
          </div>
        </template>

        <template #side>
          <div class="sapling-event-hero__stats">
            <article v-for="stat in heroStats" :key="stat.key" class="sapling-event-stat-card">
              <div class="sapling-event-stat-card__icon">
                <v-icon>{{ stat.icon }}</v-icon>
              </div>
              <div class="sapling-event-stat-card__content">
                <span>{{ stat.label }}</span>
                <strong>{{ stat.value }}</strong>
              </div>
            </article>
          </div>
        </template>
      </SaplingPageHero>

      <section class="sapling-event-workspace">
        <div class="sapling-event-workspace__main glass-panel">
          <SaplingEventToolbar
            v-model:calendar-type="calendarType"
            v-model:calendar-view-mode="calendarViewMode"
            :is-narrow-screen="isNarrowScreen"
            :calendar-type-options="calendarTypeOptions"
            @previous="goToPrevious"
            @today="goToToday"
            @next="goToNext"
          />

          <div ref="calendarScrollContainer" class="sapling-event-calendar-body">
            <SaplingEventCalendarWorkspace
              v-model="value"
              :calendar-view-mode="calendarViewMode"
              :events="events"
              :calendar-display-type="calendarDisplayType"
              :calendar-weekdays="calendarWeekdays"
              :work-hours="workHours"
              :show-work-hour-background="showWorkHourBackground"
              :selected-peoples="selectedPeoples"
              :side-by-side-grid-style="sideBySideGridStyle"
              :get-work-hour-style="getWorkHourStyle"
              :get-event-color="getEventColor"
              :now-y="nowY"
              :get-events="getEvents"
              :open-event="openEventEditor"
              :start-drag="startDrag"
              :start-time="startTime"
              :cancel-drag="cancelDrag"
              :mouse-move="mouseMove"
              :end-drag="endDrag"
              :extend-bottom="extendBottom"
              :get-person-name="getPersonName"
              :get-side-by-side-events="getSideBySideEvents"
            />
          </div>
        </div>

        <SaplingEventContextPanels
          :selected-peoples="selectedPeoples"
          :selected-people-preview="selectedPeoplePreview"
          :selected-people-overflow-count="selectedPeopleOverflowCount"
          :upcoming-events="upcomingEvents"
          :current-calendar-view-label="currentCalendarViewLabel"
          :current-calendar-layout-label="currentCalendarLayoutLabel"
          @open-filter="filterDrawerOpen = true"
          @open-event="openEventEditor"
        />
      </section>
    </template>
  </section>

  <SaplingFilterWork v-model="filterDrawerOpen" @update:selectedPeoples="onSelectedPeoplesUpdate" />

  <SaplingDialogEdit
    v-if="showEditDialog && entityEvent && templates.length > 0 && editEvent"
    :model-value="showEditDialog"
    :mode="editEvent?.event?.handle ? 'edit' : 'create'"
    :item="editEvent.event"
    :templates="templates"
    :entity="entityEvent"
    :showReference="true"
    :force-dirty="forceEditDialogDirty"
    @update:modelValue="(val) => (showEditDialog = val)"
    @update:mode="onEditDialogModeUpdate"
    @update:item="onEditDialogItemUpdate"
    @save="onEditDialogSave"
    @cancel="onEditDialogCancel"
  />
</template>

<script lang="ts" setup>
import { ref, useAttrs } from 'vue'
import { useSaplingEvent } from '@/composables/event/useSaplingEvent'
import SaplingPageHero from '@/components/common/SaplingPageHero.vue'
import SaplingFilterWork from '@/components/filter/SaplingFilterWork.vue'
import SaplingEventCalendarWorkspace from '@/components/event/SaplingEventCalendarWorkspace.vue'
import SaplingEventContextPanels from '@/components/event/SaplingEventContextPanels.vue'
import SaplingEventToolbar from '@/components/event/SaplingEventToolbar.vue'
import SaplingDialogEdit from '../dialog/SaplingDialogEdit.vue'

defineOptions({
  inheritAttrs: false,
})

const filterDrawerOpen = ref(false)
const attrs = useAttrs()

const {
  forceEditDialogDirty,
  calendarDisplayType,
  calendarType,
  calendarTypeOptions,
  currentCalendarLayoutLabel,
  currentDateRangeLabel,
  currentCalendarViewLabel,
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
  onEditDialogItemUpdate,
  onEditDialogModeUpdate,
  onEditDialogSave,
  openEventEditor,
  onSelectedPeoplesUpdate,
  selectedPeoples,
  selectedPeopleOverflowCount,
  selectedPeoplePreview,
  showEditDialog,
  showWorkHourBackground,
  sideBySideGridStyle,
  startDrag,
  startTime,
  extendBottom,
  mouseMove,
  endDrag,
  cancelDrag,
  heroStats,
  templates,
  editEvent,
  upcomingEvents,
  value,
  workHours,
} = useSaplingEvent()
</script>
