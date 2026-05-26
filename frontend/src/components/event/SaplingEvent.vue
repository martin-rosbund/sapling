<template>
  <section
    v-bind="attrs"
    class="sapling-page-shell sapling-page-shell--fill sapling-page-shell--uniform-inset sapling-dashboard-page sapling-dashboard-page--flow-lg sapling-event-page"
  >
    <template v-if="isLoading">
      <div class="sapling-page-skeleton sapling-event-skeleton">
        <SaplingSurface
          as="section"
          class="sapling-page-hero sapling-page-hero--calendar sapling-page-hero--copy-only sapling-event-skeleton__hero"
        >
          <div class="sapling-event-skeleton__hero-copy">
            <v-skeleton-loader type="text, heading, paragraph" />
          </div>
        </SaplingSurface>

        <section
          class="sapling-page-workspace sapling-page-workspace--main-context sapling-page-workspace--collapse-lg sapling-event-skeleton__workspace"
        >
          <SaplingSurface
            :as="VSkeletonLoader"
            class="sapling-event-skeleton__calendar"
            type="table-heading, table-thead, table-row-divider@8"
          />
          <div class="sapling-page-skeleton-grid sapling-event-skeleton__context">
            <SaplingSurface
              :as="VSkeletonLoader"
              class="sapling-event-skeleton__panel"
              type="list-item-three-line@3"
            />
            <SaplingSurface
              :as="VSkeletonLoader"
              class="sapling-event-skeleton__panel"
              type="list-item-three-line@4"
            />
            <SaplingSurface
              :as="VSkeletonLoader"
              class="sapling-event-skeleton__panel"
              type="article"
            />
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
          <div class="sapling-icon-tile sapling-event-hero__icon-wrap">
            <v-icon size="28">{{ entityEvent?.icon || 'mdi-calendar-month-outline' }}</v-icon>
          </div>
        </template>
      </SaplingPageHero>

      <section
        class="sapling-page-workspace sapling-page-workspace--main-context sapling-page-workspace--collapse-lg sapling-event-workspace"
      >
        <SaplingSurface
          class="sapling-workspace-panel sapling-page-panel sapling-event-workspace__main"
        >
          <SaplingEventToolbar
            v-model:calendar-type="calendarType"
            v-model:calendar-view-mode="calendarViewMode"
            v-model:calendar-mode="calendarMode"
            :is-narrow-screen="isNarrowScreen"
            :calendar-type-options="calendarTypeOptions"
            :model-value="value"
            @previous="goToPrevious"
            @today="goToToday"
            @next="goToNext"
            @select-date="goToDate"
          />

          <div
            ref="calendarScrollContainer"
            class="sapling-calendar-frame sapling-event-calendar-body"
          >
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
              :open-context-menu="openEventContextMenu"
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
        </SaplingSurface>

        <SaplingEventContextPanels
          :is-mobile-filter-layout="isMobileContextLayout"
          :upcoming-events="upcomingEvents"
          :selected-peoples="selectedPeoples"
          :selected-people-preview="selectedPeoplePreview"
          :selected-people-overflow-count="selectedPeopleOverflowCount"
          @update-selected-peoples="onSelectedPeoplesUpdate"
          @open-filter="toggleContextDialog"
          @open-event="openEventEditor"
        />
      </section>
    </template>
  </section>

  <v-dialog
    v-if="isMobileContextLayout"
    v-model="mobileContextDialogVisible"
    class="sapling-event-context-dialog"
    :max-width="SAPLING_DIALOG_MAX_WIDTH.md"
    scrollable
  >
    <div class="sapling-event-context-dialog__surface">
      <SaplingWorkFilterPanel
        class="sapling-event-context-dialog__panel"
        :show-close-action="true"
        :close-action-label="contextDialogCloseLabel"
        @close="mobileContextDialogVisible = false"
        @update:selected-peoples="onSelectedPeoplesUpdate"
      />
    </div>
  </v-dialog>

  <SaplingDialogEdit
    v-if="showEditDialog && entityEvent && templates.length > 0 && editEvent"
    :model-value="showEditDialog"
    :mode="editEvent?.event?.handle ? 'edit' : 'create'"
    :item="editEvent.event"
    :templates="templates"
    :entity="entityEvent"
    :showReference="true"
    :force-dirty-fields="forceEditDialogDirtyFields"
    @update:modelValue="(val) => (showEditDialog = val)"
    @update:mode="onEditDialogModeUpdate"
    @update:item="onEditDialogItemUpdate"
    @save="onEditDialogSave"
    @cancel="onEditDialogCancel"
  />

  <SaplingDialogUpdateConflict
    :model-value="updateConflictDialog.visible"
    :conflict="updateConflictDialog.conflict"
    entity-handle="event"
    :entity-templates="templates"
    :is-saving="updateConflictDialog.isSaving"
    @update:model-value="handleUpdateConflictVisibility"
    @merge="mergeUpdateConflict"
    @reload="reloadUpdateConflictRecord"
    @open-change-log="openUpdateConflictChangeLog"
  />

  <v-menu
    v-model="eventContextMenu.visible"
    :style="eventContextMenuStyle"
    absolute
    content-class="sapling-context-menu__content"
    transition="slide-y-transition"
  >
    <SaplingSurface
      :as="SaplingRecordActionMenuList"
      density="compact"
      elevation="8"
      min-width="200"
      :menu-items="eventContextMenuItems"
      :show-edit="false"
      @select="handleEventContextMenuAction"
      @close="closeEventContextMenu"
    />
  </v-menu>

  <SaplingTableRowUpload
    v-if="showUploadDialog"
    :show="showUploadDialog"
    :item="uploadDialogItem"
    entityHandle="event"
    @close="closeUploadDialog"
    @uploaded="closeUploadDialog"
  />

  <SaplingTableRowInformation
    v-if="showInformationDialog"
    :show="showInformationDialog"
    :item="informationDialogItem"
    entityHandle="event"
    @close="closeInformationDialog"
    @saved="closeInformationDialog"
  />
</template>

<script lang="ts" setup>
import { computed, ref, useAttrs, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import { VSkeletonLoader } from 'vuetify/components'
import { useSaplingEvent } from '@/composables/event/useSaplingEvent'
import SaplingPageHero from '@/components/common/SaplingPageHero.vue'
import SaplingSurface from '@/components/common/SaplingSurface.vue'
import SaplingEventCalendarWorkspace from '@/components/event/SaplingEventCalendarWorkspace.vue'
import SaplingEventContextPanels from '@/components/event/SaplingEventContextPanels.vue'
import SaplingEventToolbar from '@/components/event/SaplingEventToolbar.vue'
import SaplingWorkFilterPanel from '@/components/filter/SaplingWorkFilterPanel.vue'
import SaplingRecordActionMenuList from '@/components/common/SaplingRecordActionMenuList.vue'
import SaplingTableRowInformation from '@/components/table/SaplingTableRowInformation.vue'
import SaplingTableRowUpload from '@/components/table/SaplingTableRowUpload.vue'
import SaplingDialogEdit from '../dialog/SaplingDialogEdit.vue'
import SaplingDialogUpdateConflict from '@/components/dialog/SaplingDialogUpdateConflict.vue'
import { SAPLING_DIALOG_MAX_WIDTH } from '@/constants/dialog.constants'

defineOptions({
  inheritAttrs: false,
})

const EVENT_CONTEXT_DIALOG_BREAKPOINT = 1080

const attrs = useAttrs()
const { t } = useI18n()
const { width } = useDisplay()

const isMobileContextLayout = computed(() => width.value <= EVENT_CONTEXT_DIALOG_BREAKPOINT)
const mobileContextDialogVisible = ref(false)

const contextDialogCloseLabel = computed(() => t('global.close'))

watch(isMobileContextLayout, (isMobile) => {
  if (!isMobile) {
    mobileContextDialogVisible.value = false
  }
})

function toggleContextDialog() {
  mobileContextDialogVisible.value = !mobileContextDialogVisible.value
}

const {
  forceEditDialogDirtyFields,
  calendarDisplayType,
  calendarType,
  calendarTypeOptions,
  calendarMode,
  currentDateRangeLabel,
  calendarViewMode,
  calendarWeekdays,
  currentMonthLabel,
  eventContextMenu,
  eventContextMenuItems,
  eventContextMenuStyle,
  entityEvent,
  events,
  getEventColor,
  getEvents,
  getPersonName,
  getSideBySideEvents,
  getWorkHourStyle,
  goToDate,
  goToNext,
  goToPrevious,
  goToToday,
  handleUpdateConflictVisibility,
  isLoading,
  isNarrowScreen,
  mergeUpdateConflict,
  nowY,
  openEventContextMenu,
  handleEventContextMenuAction,
  onEditDialogCancel,
  onEditDialogItemUpdate,
  onEditDialogModeUpdate,
  onEditDialogSave,
  openUpdateConflictChangeLog,
  openEventEditor,
  onSelectedPeoplesUpdate,
  reloadUpdateConflictRecord,
  selectedPeoples,
  selectedPeopleOverflowCount,
  selectedPeoplePreview,
  closeEventContextMenu,
  closeInformationDialog,
  closeUploadDialog,
  showEditDialog,
  showInformationDialog,
  showWorkHourBackground,
  showUploadDialog,
  sideBySideGridStyle,
  startDrag,
  startTime,
  extendBottom,
  mouseMove,
  endDrag,
  cancelDrag,
  informationDialogItem,
  templates,
  updateConflictDialog,
  uploadDialogItem,
  editEvent,
  upcomingEvents,
  value,
  workHours,
} = useSaplingEvent()
</script>
