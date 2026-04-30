<template>
  <div class="sapling-field-event-recurrence">
    <v-select
      :label="props.label"
      :items="frequencyOptions"
      :model-value="frequency"
      :disabled="props.disabled"
      item-title="title"
      item-value="value"
      hide-details="auto"
      @update:model-value="onFrequencyChange"
    />

    <div v-if="frequency !== 'NONE'" class="sapling-field-event-recurrence__body">
      <div class="sapling-field-event-recurrence__row">
        <v-text-field
          :label="t('event.recurrenceEvery')"
          :model-value="String(interval)"
          :disabled="props.disabled"
          type="number"
          min="1"
          hide-details="auto"
          @update:model-value="onIntervalChange"
        />
      </div>

      <div
        v-if="frequency === 'WEEKLY'"
        class="sapling-field-event-recurrence__row sapling-field-event-recurrence__row--weekdays"
      >
        <span class="sapling-field-event-recurrence__label">
          {{ t('event.recurrenceWeekdays') }}
        </span>

        <v-btn-toggle
          :model-value="weekdays"
          multiple
          divided
          density="comfortable"
          :disabled="props.disabled"
          @update:model-value="onWeekdaysChange"
        >
          <v-btn v-for="item in weekdayOptions" :key="item.value" :value="item.value" size="small">
            {{ item.shortLabel }}
          </v-btn>
        </v-btn-toggle>
      </div>

      <div class="sapling-field-event-recurrence__row sapling-field-event-recurrence__row--ends">
        <v-select
          :label="t('event.recurrenceEnds')"
          :items="endModeOptions"
          :model-value="endMode"
          :disabled="props.disabled"
          item-title="title"
          item-value="value"
          hide-details="auto"
          @update:model-value="onEndModeChange"
        />

        <v-text-field
          v-if="endMode === 'count'"
          :label="t('event.recurrenceCount')"
          :model-value="count == null ? '' : String(count)"
          :disabled="props.disabled"
          type="number"
          min="1"
          hide-details="auto"
          @update:model-value="onCountChange"
        />

        <div v-else-if="endMode === 'until'" class="sapling-field-event-recurrence__until">
          <v-text-field
            :label="t('event.recurrenceUntil')"
            :model-value="untilDate"
            :disabled="props.disabled"
            type="date"
            hide-details="auto"
            @update:model-value="(value) => (untilDate = stringifyValue(value))"
          />
          <v-text-field
            v-if="!props.isAllDay"
            :label="t('event.endDate')"
            :model-value="untilTime"
            :disabled="props.disabled"
            type="time"
            hide-details="auto"
            @update:model-value="(value) => (untilTime = stringifyValue(value))"
          />
        </div>
      </div>

      <v-alert
        variant="tonal"
        density="comfortable"
        color="primary"
        icon="mdi-repeat"
        class="sapling-field-event-recurrence__summary"
      >
        {{ summaryLabel }}
      </v-alert>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  buildRecurrenceRule,
  parseRecurrenceRule,
  type RecurrenceEndMode,
  type RecurrenceFrequency,
  type RecurrenceWeekdayCode,
  weekdayCodeFromDate,
} from '@/utils/eventRecurrence'

const props = defineProps<{
  label: string
  modelValue?: string | null
  startDateValue?: string
  startTimeValue?: string
  isAllDay?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string | null): void
}>()

const { t } = useI18n()

const frequency = ref<'NONE' | RecurrenceFrequency>('NONE')
const interval = ref(1)
const weekdays = ref<RecurrenceWeekdayCode[]>([])
const endMode = ref<RecurrenceEndMode>('never')
const count = ref<number | null>(null)
const untilDate = ref('')
const untilTime = ref('')
const isHydrating = ref(false)

const frequencyOptions = computed(() => [
  { title: t('event.recurrenceNever'), value: 'NONE' },
  { title: t('event.recurrenceDaily'), value: 'DAILY' },
  { title: t('event.recurrenceWeekly'), value: 'WEEKLY' },
  { title: t('event.recurrenceMonthly'), value: 'MONTHLY' },
  { title: t('event.recurrenceYearly'), value: 'YEARLY' },
])

const endModeOptions = computed(() => [
  { title: t('event.recurrenceEndsNever'), value: 'never' },
  { title: t('event.recurrenceEndsOn'), value: 'until' },
  { title: t('event.recurrenceEndsAfter'), value: 'count' },
])

const weekdayOptions = computed(() =>
  [
    { value: 'MO', label: t('event.monday') },
    { value: 'TU', label: t('event.tuesday') },
    { value: 'WE', label: t('event.wednesday') },
    { value: 'TH', label: t('event.thursday') },
    { value: 'FR', label: t('event.friday') },
    { value: 'SA', label: t('event.saturday') },
    { value: 'SU', label: t('event.sunday') },
  ].map((item) => ({
    ...item,
    shortLabel: item.label.slice(0, 2),
  })),
)

const summaryLabel = computed(() => {
  if (frequency.value === 'NONE') {
    return t('event.recurrenceNever')
  }

  const parts = [
    `${t('event.recurrenceEvery')} ${interval.value} ${getFrequencyLabel(frequency.value)}`,
  ]

  if (frequency.value === 'WEEKLY' && weekdays.value.length > 0) {
    const weekdayLabels = weekdayOptions.value
      .filter((item) => weekdays.value.includes(item.value as RecurrenceWeekdayCode))
      .map((item) => item.label)
    if (weekdayLabels.length > 0) {
      parts.push(weekdayLabels.join(', '))
    }
  }

  if (endMode.value === 'count' && count.value) {
    parts.push(`${t('event.recurrenceEndsAfter')} ${count.value}`)
  }

  if (endMode.value === 'until' && untilDate.value) {
    parts.push(`${t('event.recurrenceEndsOn')} ${untilDate.value}`)
  }

  return parts.join(' | ')
})

watch(
  () => props.modelValue,
  (value) => {
    hydrateFromModel(value)
  },
  { immediate: true },
)

watch(
  [
    frequency,
    interval,
    weekdays,
    endMode,
    count,
    untilDate,
    untilTime,
    () => props.startDateValue,
    () => props.startTimeValue,
    () => props.isAllDay,
  ],
  () => {
    if (isHydrating.value) {
      return
    }

    emit(
      'update:modelValue',
      buildRecurrenceRule({
        frequency: frequency.value,
        interval: interval.value,
        weekdays: weekdays.value,
        endMode: endMode.value,
        count: count.value,
        untilDate: untilDate.value,
        untilTime: untilTime.value,
        startDate: props.startDateValue,
        startTime: props.startTimeValue,
        isAllDay: props.isAllDay,
      }),
    )
  },
  { deep: true },
)

function hydrateFromModel(value?: string | null) {
  isHydrating.value = true

  const parsedRule = parseRecurrenceRule(value)
  if (!parsedRule) {
    frequency.value = 'NONE'
    interval.value = 1
    weekdays.value = resolveDefaultWeekdays()
    endMode.value = 'never'
    count.value = null
    untilDate.value = ''
    untilTime.value = ''
    isHydrating.value = false

    if (value === '') {
      emit('update:modelValue', null)
    }
    return
  }

  frequency.value = parsedRule.frequency
  interval.value = parsedRule.interval
  weekdays.value =
    parsedRule.byDay.length > 0 ? parsedRule.byDay : resolveDefaultWeekdays(parsedRule.frequency)
  endMode.value = parsedRule.count ? 'count' : parsedRule.until ? 'until' : 'never'
  count.value = parsedRule.count ?? null
  untilDate.value = parsedRule.until ? formatLocalDate(parsedRule.until) : ''
  untilTime.value = parsedRule.until ? formatLocalTime(parsedRule.until) : ''
  isHydrating.value = false
}

function onFrequencyChange(value: unknown) {
  const nextFrequency = stringifyValue(value).toUpperCase() as 'NONE' | RecurrenceFrequency
  frequency.value =
    nextFrequency === 'DAILY' ||
    nextFrequency === 'WEEKLY' ||
    nextFrequency === 'MONTHLY' ||
    nextFrequency === 'YEARLY'
      ? nextFrequency
      : 'NONE'

  if (frequency.value !== 'WEEKLY') {
    weekdays.value = []
    return
  }

  if (weekdays.value.length === 0) {
    weekdays.value = resolveDefaultWeekdays('WEEKLY')
  }
}

function onIntervalChange(value: unknown) {
  const nextValue = Number.parseInt(stringifyValue(value), 10)
  interval.value = Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 1
}

function onWeekdaysChange(value: unknown) {
  weekdays.value = Array.isArray(value)
    ? value.filter((item): item is RecurrenceWeekdayCode =>
        ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].includes(String(item)),
      )
    : []
}

function onEndModeChange(value: unknown) {
  const nextValue = stringifyValue(value) as RecurrenceEndMode
  endMode.value = ['never', 'until', 'count'].includes(nextValue) ? nextValue : 'never'

  if (endMode.value !== 'count') {
    count.value = null
  }

  if (endMode.value !== 'until') {
    untilDate.value = ''
    untilTime.value = ''
  }
}

function onCountChange(value: unknown) {
  const nextValue = Number.parseInt(stringifyValue(value), 10)
  count.value = Number.isFinite(nextValue) && nextValue > 0 ? nextValue : null
}

function resolveDefaultWeekdays(nextFrequency?: 'WEEKLY' | RecurrenceFrequency) {
  if (nextFrequency && nextFrequency !== 'WEEKLY') {
    return [] as RecurrenceWeekdayCode[]
  }

  const baseDate = parseDateInput(props.startDateValue)
  return baseDate ? [weekdayCodeFromDate(baseDate)] : ['MO']
}

function parseDateInput(value?: string) {
  if (!value) {
    return null
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const parsedDate = new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

function getFrequencyLabel(value: RecurrenceFrequency) {
  switch (value) {
    case 'DAILY':
      return t('event.recurrenceDaily')
    case 'WEEKLY':
      return t('event.recurrenceWeekly')
    case 'MONTHLY':
      return t('event.recurrenceMonthly')
    case 'YEARLY':
      return t('event.recurrenceYearly')
  }
}

function formatLocalDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function formatLocalTime(date: Date) {
  return [
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
  ].join(':')
}

function stringifyValue(value: unknown) {
  return value == null ? '' : String(value)
}
</script>
