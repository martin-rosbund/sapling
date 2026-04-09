<template>
  <section v-bind="attrs" class="sapling-event-page  pa-1 pr-10">
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
            <v-skeleton-loader class="glass-panel sapling-event-skeleton__panel" type="list-item-three-line@3" />
            <v-skeleton-loader class="glass-panel sapling-event-skeleton__panel" type="list-item-three-line@4" />
            <v-skeleton-loader class="glass-panel sapling-event-skeleton__panel" type="article" />
          </div>
        </section>
      </div>
    </template>

    <template v-else>
      <section class="sapling-event-hero glass-panel">
        <div class="sapling-event-hero__copy">
          <p class="sapling-event-hero__eyebrow">{{ $t('navigation.calendar') }}</p>
          <div class="sapling-event-hero__title-row">
            <div class="sapling-event-hero__icon-wrap">
              <v-icon size="28">{{ entityEvent?.icon || 'mdi-calendar-month-outline' }}</v-icon>
            </div>
            <div class="sapling-event-hero__title-copy">
              <h1 class="sapling-event-hero__title">{{ currentMonthLabel }}</h1>
              <p class="sapling-event-hero__subtitle">{{ currentDateRangeLabel }}</p>
            </div>
          </div>
        </div>

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
      </section>

      <section class="sapling-event-workspace">
        <div class="sapling-event-workspace__main glass-panel">
          <header class="sapling-event-toolbar">
            <div class="sapling-event-toolbar__primary">
              <v-btn-group class="sapling-event-toolbar__nav" density="comfortable">
                <v-btn variant="outlined" icon="mdi-chevron-left" @click="goToPrevious" />
                <v-btn variant="tonal" @click="goToToday">{{ $t('event.today') }}</v-btn>
                <v-btn variant="outlined" icon="mdi-chevron-right" @click="goToNext" />
              </v-btn-group>
            </div>

            <div class="sapling-event-toolbar__secondary">
              <v-btn-toggle
                v-if="!isNarrowScreen"
                v-model="calendarViewMode"
                class="sapling-event-toolbar__view-toggle"
                density="comfortable"
                mandatory
              >
                <v-btn variant="outlined" value="single">{{ $t('calendar.combined') }}</v-btn>
                <v-btn variant="outlined" value="sidebyside">{{ $t('calendar.sideBySide') }}</v-btn>
              </v-btn-toggle>

              <div class="d-none d-md-flex">
                <v-btn-toggle
                  v-model="calendarType"
                  class="sapling-event-toolbar__type-toggle"
                  density="comfortable"
                  mandatory
                >
                  <v-btn variant="outlined" value="day">{{ $t('calendar.day') }}</v-btn>
                  <v-btn variant="outlined" value="workweek">{{ $t('calendar.workweek') }}</v-btn>
                  <v-btn variant="outlined" value="week">{{ $t('calendar.week') }}</v-btn>
                  <v-btn variant="outlined" value="month">{{ $t('calendar.month') }}</v-btn>
                </v-btn-toggle>
              </div>

              <div class="sapling-event-toolbar__overflow d-flex d-md-none">
                <v-menu offset-y>
                  <template #activator="{ props }">
                    <v-btn v-bind="props" icon="mdi-tune" variant="text" />
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
          </header>

          <div
            ref="calendarScrollContainer"
            class="sapling-event-calendar-body"
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
                :open-event="openEventEditor"
                :start-drag="startDrag"
                :start-time="startTime"
                :cancel-drag="cancelDrag"
                :mouse-move="mouseMove"
                :end-drag="endDrag"
                :extend-bottom="extendBottom"
              />
            </template>

            <template v-else>
              <div class="sapling-event-sidebyside-shell">
                <div class="sapling-event-sidebyside-grid" :style="sideBySideGridStyle">
                  <section
                    v-for="personId in selectedPeoples"
                    :key="personId"
                    class="sapling-event-sidebyside-column"
                  >
                    <header class="sapling-event-sidebyside-column__header">
                      <span>{{ getPersonName(personId) }}</span>
                    </header>

                    <div class="sapling-event-sidebyside-column__calendar">
                      <SaplingEventCalendar
                        v-model="value"
                        :events="getSideBySideEvents(personId)"
                        :calendar-display-type="calendarDisplayType"
                        :calendar-weekdays="calendarWeekdays"
                        :work-hours="workHours"
                        :show-work-hour-background="showWorkHourBackground"
                        :calendar-style="'width: 100%; max-width: 100%; height: 100%'"
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
                      />
                    </div>
                  </section>
                </div>
              </div>
            </template>
          </div>
        </div>

        <aside class="sapling-event-context">
          <section class="sapling-event-panel glass-panel">
            <div class="sapling-event-panel__header">
              <div>
                <p class="sapling-event-panel__eyebrow">{{ $t('navigation.person') }}</p>
                <h2 class="sapling-event-panel__title">
                  {{ selectedPeoples.length }} {{ $t('global.selected') }}
                </h2>
              </div>

              <v-btn
                icon="mdi-filter-variant"
                variant="text"
                @click="filterDrawerOpen = true"
              />
            </div>

            <div class="sapling-event-selection-chips">
              <v-chip
                v-for="person in selectedPeoplePreview"
                :key="person.handle"
                :color="person.isOwn ? 'primary' : undefined"
                :variant="person.isOwn ? 'flat' : 'outlined'"
                size="small"
              >
                {{ person.name }}
              </v-chip>

              <v-chip v-if="selectedPeopleOverflowCount > 0" size="small" variant="outlined">
                +{{ selectedPeopleOverflowCount }}
              </v-chip>

              <div
                v-if="selectedPeoplePreview.length === 0"
                class="sapling-event-panel__empty-inline"
              >
                <v-icon size="18">mdi-account-group-outline</v-icon>
                <span>0 {{ $t('navigation.person') }}</span>
              </div>
            </div>
          </section>

          <section class="sapling-event-panel glass-panel">
            <div class="sapling-event-panel__header">
              <div>
                <p class="sapling-event-panel__eyebrow">{{ $t('navigation.event') }}</p>
                <h2 class="sapling-event-panel__title">{{ $t('event.today') }}</h2>
              </div>
            </div>

            <div v-if="upcomingEvents.length > 0" class="sapling-event-agenda-list">
              <article
                v-for="item in upcomingEvents"
                :key="item.key"
                class="sapling-event-agenda-item"
                :class="{ 'sapling-event-agenda-item--active': item.isOngoing }"
              >
                <div
                  class="sapling-event-agenda-item__icon"
                  :style="{ '--sapling-event-accent': item.accentColor }"
                >
                  <v-icon size="18">{{ item.icon }}</v-icon>
                </div>

                <div class="sapling-event-agenda-item__content">
                  <div class="sapling-event-agenda-item__row">
                    <strong>{{ item.title }}</strong>
                  </div>
                  <div class="sapling-event-agenda-item__row">
                    <small>{{ item.timeLabel || item.dateLabel }}</small>
                  </div>
                  <p>{{ item.description || item.dateLabel }}</p>
                  <small v-if="item.participantCount > 0">
                    {{ item.participantCount }} {{ $t('navigation.person') }}
                  </small>
                </div>
              </article>
            </div>

            <div v-else class="sapling-event-panel__empty-state">
              <v-icon size="26">mdi-calendar-clock-outline</v-icon>
              <strong>{{ currentCalendarViewLabel }}</strong>
              <span>{{ currentCalendarLayoutLabel }}</span>
            </div>
          </section>
        </aside>
      </section>
    </template>
  </section>

  <SaplingFilterWork
    v-model="filterDrawerOpen"
    @update:selectedPeoples="onSelectedPeoplesUpdate"
  />

  <SaplingDialogEdit
    v-if="showEditDialog && entityEvent && templates.length > 0 && editEvent"
    :model-value="showEditDialog"
    :mode="editEvent?.event?.handle ? 'edit' : 'create'"
    :item="editEvent.event"
    :templates="templates"
    :entity="entityEvent"
    @update:modelValue="(val) => (showEditDialog = val)"
    @update:mode="onEditDialogModeUpdate"
    @update:item="onEditDialogItemUpdate"
    @save="onEditDialogSave"
    @cancel="onEditDialogCancel"
    :showReference="true"
  />
</template>

<script lang="ts" setup>
// #region Imports
import { ref, useAttrs } from 'vue'
import { useSaplingEvent } from '@/composables/event/useSaplingEvent'
import SaplingFilterWork from '@/components/filter/SaplingFilterWork.vue'
import SaplingEventCalendar from '@/components/event/SaplingEventCalendar.vue'
import SaplingDialogEdit from '../dialog/SaplingDialogEdit.vue'
// #endregion

defineOptions({
  inheritAttrs: false,
})

const filterDrawerOpen = ref(false)
const attrs = useAttrs()

// #region Composable
const {
  calendarDisplayType,
  calendarScrollContainer,
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
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingCalendar.css"></style>
