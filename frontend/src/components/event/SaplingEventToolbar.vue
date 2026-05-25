<template>
  <header class="sapling-split-toolbar sapling-event-toolbar">
    <div class="sapling-toolbar-group sapling-event-toolbar__primary">
      <div class="sapling-toolbar-nav-group sapling-event-toolbar__nav-group">
        <v-btn-group class="sapling-event-toolbar__nav" density="comfortable">
          <v-btn variant="outlined" icon="mdi-chevron-left" @click="emit('previous')" />
          <v-btn prepend-icon="mdi-calendar-today" variant="tonal" @click="emit('today')">
            <template v-if="$vuetify.display.mdAndUp"> {{ $t('event.today') }}</template>
          </v-btn>
          <v-menu
            v-model="pickerMenuOpen"
            :close-on-content-click="false"
            location="bottom start"
            offset="12"
          >
            <template #activator="{ props: activatorProps }">
              <v-btn
                v-bind="activatorProps"
                class="sapling-button-truncate sapling-event-toolbar__picker-trigger"
                prepend-icon="mdi-calendar-search"
                variant="tonal"
              >
                <template v-if="$vuetify.display.mdAndUp">
                  {{ $t('calendar.selectDate') }}</template
                >
              </v-btn>
            </template>

            <SaplingSurface class="sapling-picker-panel sapling-event-toolbar__picker-panel">
              <v-date-picker
                v-if="isMonthPicker"
                :model-value="pickerDateModel"
                :month="pickerMonth"
                :year="pickerYear"
                first-day-of-week="1"
                hide-title
                view-mode="months"
                @update:month="onMonthPicked"
                @update:year="onPickerYearUpdated"
              />

              <v-date-picker
                v-else
                :model-value="pickerDateModel"
                first-day-of-week="1"
                hide-title
                :show-week="isWeekPicker"
                @update:model-value="onDatePicked"
              />
            </SaplingSurface>
          </v-menu>
          <v-btn variant="outlined" icon="mdi-chevron-right" @click="emit('next')" />
        </v-btn-group>
      </div>
    </div>

    <div class="sapling-toolbar-group sapling-event-toolbar__secondary">
      <v-btn-toggle
        v-model="calendarModeModel"
        class="sapling-toolbar-toggle sapling-event-toolbar__mode-toggle"
        density="comfortable"
        mandatory
      >
        <v-btn prepend-icon="mdi-perspective-less" variant="outlined" value="default">
          <template v-if="$vuetify.display.mdAndUp"> {{ $t('calendar.standard') }}</template>
        </v-btn>
        <v-btn prepend-icon="mdi-perspective-more" variant="outlined" value="extended">
          <template v-if="$vuetify.display.mdAndUp"> {{ $t('calendar.extended') }}</template>
        </v-btn>
      </v-btn-toggle>

      <v-btn-toggle
        v-if="!isNarrowScreen"
        v-model="calendarViewModeModel"
        class="sapling-toolbar-toggle sapling-event-toolbar__view-toggle"
        density="comfortable"
        mandatory
      >
        <v-btn prepend-icon="mdi-call-merge" variant="outlined" value="single">
          <template v-if="$vuetify.display.mdAndUp"> {{ $t('calendar.combined') }}</template>
        </v-btn>
        <v-btn prepend-icon="mdi-call-split" variant="outlined" value="sidebyside">
          <template v-if="$vuetify.display.mdAndUp"> {{ $t('calendar.sideBySide') }}</template>
        </v-btn>
      </v-btn-toggle>

      <div class="d-none d-md-flex">
        <v-btn-toggle
          v-model="calendarTypeModel"
          class="sapling-toolbar-toggle sapling-event-toolbar__type-toggle"
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

          <SaplingSurface :as="VList">
            <v-list-item
              v-for="type in calendarTypeOptions"
              :key="type"
              @click="calendarTypeModel = type"
            >
              <v-list-item-title>{{ $t(`calendar.${type}`) }}</v-list-item-title>
            </v-list-item>
          </SaplingSurface>
        </v-menu>
      </div>
    </div>
  </header>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { VList } from 'vuetify/components'
import SaplingSurface from '@/components/common/SaplingSurface.vue'

type CalendarType = 'workweek' | 'month' | 'day' | 'week'
type CalendarViewMode = 'single' | 'sidebyside'
type CalendarMode = 'default' | 'extended'

const props = defineProps<{
  isNarrowScreen: boolean
  calendarType: CalendarType
  calendarTypeOptions: CalendarType[]
  calendarViewMode: CalendarViewMode
  calendarMode: CalendarMode
  modelValue: string
}>()

const emit = defineEmits<{
  (event: 'update:calendarType', value: CalendarType): void
  (event: 'update:calendarViewMode', value: CalendarViewMode): void
  (event: 'update:calendarMode', value: CalendarMode): void
  (event: 'previous'): void
  (event: 'today'): void
  (event: 'next'): void
  (event: 'selectDate', value: string): void
}>()

const calendarTypeModel = computed({
  get: () => props.calendarType,
  set: (value: CalendarType) => emit('update:calendarType', value),
})

const calendarViewModeModel = computed({
  get: () => props.calendarViewMode,
  set: (value: CalendarViewMode) => emit('update:calendarViewMode', value),
})

const calendarModeModel = computed({
  get: () => props.calendarMode,
  set: (value: CalendarMode) => emit('update:calendarMode', value),
})

const pickerMenuOpen = ref(false)
const pickerYear = ref(resolvePickerDate(props.modelValue).getFullYear())

const pickerDateModel = computed(() => resolvePickerDate(props.modelValue))
const pickerMonth = computed(() => pickerDateModel.value.getMonth())
const isWeekPicker = computed(() => ['week', 'workweek'].includes(props.calendarType))
const isMonthPicker = computed(() => props.calendarType === 'month')

watch(
  () => props.modelValue,
  (value) => {
    pickerYear.value = resolvePickerDate(value).getFullYear()
  },
  { immediate: true },
)

function onDatePicked(value: unknown) {
  const selectedDate = toDate(value)
  if (!selectedDate) {
    return
  }

  emit('selectDate', formatLocalDate(selectedDate))
  pickerMenuOpen.value = false
}

function onMonthPicked(value: unknown) {
  const selectedMonth = Number(value)
  if (Number.isNaN(selectedMonth)) {
    return
  }

  const nextDate = new Date(pickerYear.value, selectedMonth, 1)
  emit('selectDate', formatLocalDate(nextDate))
  pickerMenuOpen.value = false
}

function onPickerYearUpdated(value: unknown) {
  const selectedYear = Number(value)
  if (Number.isNaN(selectedYear)) {
    return
  }

  pickerYear.value = selectedYear
}

function toDate(value: unknown) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsedDate = new Date(value)
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
  }

  return null
}

function resolvePickerDate(input: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim())
  if (!match) {
    const parsedDate = new Date(input)
    return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate
  }

  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
</script>
