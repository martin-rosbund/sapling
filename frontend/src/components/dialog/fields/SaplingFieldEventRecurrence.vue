<template>
  <div class="sapling-field-event-recurrence">
    <span class="sapling-field-event-recurrence__label">{{ props.label }}</span>

    <button
      type="button"
      class="sapling-field-event-recurrence__trigger glass-panel"
      :class="{ 'sapling-field-event-recurrence__trigger--disabled': props.disabled }"
      :disabled="props.disabled"
      @click="openDialog"
    >
      <div class="sapling-field-event-recurrence__trigger-copy">
        <strong class="sapling-field-event-recurrence__trigger-title">
          {{ fieldSummaryTitle }}
        </strong>
        <span v-if="fieldSummarySubtitle" class="sapling-field-event-recurrence__trigger-subtitle">
          {{ fieldSummarySubtitle }}
        </span>
      </div>
      <v-icon size="20">mdi-repeat</v-icon>
    </button>

    <v-dialog v-if="dialog" v-model="dialog" class="sapling-dialog-medium" persistent>
      <v-card
        class="glass-panel tilt-content sapling-account-dialog sapling-field-event-recurrence__dialog"
        elevation="12"
      >
        <SaplingDialogShell
          fill-shell
          body-class="sapling-account-dialog__body sapling-field-event-recurrence__body"
          :show-divider="false"
        >
          <template #hero>
            <SaplingDialogHero :eyebrow="props.label" :title="draftSummaryTitle" />
          </template>

          <template #body>
            <div class="sapling-account-dialog__content sapling-field-event-recurrence__content">
              <div class="sapling-field-event-recurrence__dialog-content">
                <section class="sapling-field-event-recurrence__section">
                  <div class="sapling-field-event-recurrence__section-header">
                    {{ props.label }}
                  </div>

                  <div class="sapling-field-event-recurrence__option-grid">
                    <v-btn
                      v-for="item in frequencyOptions"
                      :key="item.value"
                      class="sapling-field-event-recurrence__option-button"
                      :color="draftFrequency === item.value ? 'primary' : undefined"
                      :variant="draftFrequency === item.value ? 'flat' : 'outlined'"
                      @click="selectFrequency(item.value)"
                    >
                      {{ item.label }}
                    </v-btn>
                  </div>
                </section>

                <template v-if="draftFrequency !== 'NONE'">
                  <section class="sapling-field-event-recurrence__section">
                    <div class="sapling-field-event-recurrence__section-header">
                      {{ t('event.recurrenceEvery') }}
                    </div>

                    <div class="sapling-field-event-recurrence__field-row">
                      <div class="sapling-field-event-recurrence__field-box">
                        <SaplingNumberField
                          :label="t('event.recurrenceEvery')"
                          :model-value="draftInterval"
                          @update:model-value="onIntervalChange"
                        />
                      </div>
                    </div>
                  </section>

                  <section
                    v-if="draftFrequency === 'WEEKLY'"
                    class="sapling-field-event-recurrence__section"
                  >
                    <div class="sapling-field-event-recurrence__section-header">
                      {{ t('event.recurrenceWeekdays') }}
                    </div>

                    <div
                      class="sapling-field-event-recurrence__option-grid sapling-field-event-recurrence__option-grid--weekdays"
                    >
                      <v-btn
                        v-for="item in weekdayOptions"
                        :key="item.value"
                        class="sapling-field-event-recurrence__option-button sapling-field-event-recurrence__option-button--weekday"
                        :color="draftWeekdays.includes(item.value) ? 'primary' : undefined"
                        :variant="draftWeekdays.includes(item.value) ? 'flat' : 'outlined'"
                        @click="toggleWeekday(item.value)"
                      >
                        {{ item.shortLabel }}
                      </v-btn>
                    </div>
                  </section>

                  <section class="sapling-field-event-recurrence__section">
                    <div class="sapling-field-event-recurrence__section-header">
                      {{ t('event.recurrenceEnds') }}
                    </div>

                    <div class="sapling-field-event-recurrence__option-grid">
                      <v-btn
                        v-for="item in endModeOptions"
                        :key="item.value"
                        class="sapling-field-event-recurrence__option-button"
                        :color="draftEndMode === item.value ? 'primary' : undefined"
                        :variant="draftEndMode === item.value ? 'flat' : 'outlined'"
                        @click="selectEndMode(item.value)"
                      >
                        {{ item.label }}
                      </v-btn>
                    </div>

                    <div
                      v-if="draftEndMode === 'count'"
                      class="sapling-field-event-recurrence__field-row"
                    >
                      <div class="sapling-field-event-recurrence__field-box">
                        <SaplingNumberField
                          :label="t('event.recurrenceCount')"
                          :model-value="draftCount"
                          @update:model-value="onCountChange"
                        />
                      </div>
                    </div>

                    <div
                      v-else-if="draftEndMode === 'until'"
                      class="sapling-field-event-recurrence__field-row"
                    >
                      <div class="sapling-field-event-recurrence__field-box">
                        <SaplingDateTypeField
                          :label="t('event.recurrenceUntil')"
                          :model-value="draftUntilDate || null"
                          @update:model-value="(value) => (draftUntilDate = stringifyValue(value))"
                        />
                      </div>
                      <div v-if="!props.isAllDay" class="sapling-field-event-recurrence__field-box">
                        <SaplingTimeField
                          :label="t('event.endDate')"
                          :model-value="draftUntilTime || null"
                          @update:model-value="(value) => (draftUntilTime = stringifyValue(value))"
                        />
                      </div>
                    </div>
                  </section>
                </template>

                <v-alert
                  class="sapling-field-event-recurrence__preview"
                  color="primary"
                  density="comfortable"
                  icon="mdi-calendar-sync"
                  variant="tonal"
                >
                  {{ draftSummaryLabel }}
                </v-alert>
              </div>
            </div>
          </template>

          <template #actions>
            <SaplingActionRecurrence :cancel="closeDialog" :reset="resetDraft" :save="saveDialog" />
          </template>
        </SaplingDialogShell>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SaplingActionRecurrence from '@/components/actions/SaplingActionRecurrence.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import SaplingDialogShell from '@/components/common/SaplingDialogShell.vue'
import SaplingNumberField from '@/components/dialog/fields/SaplingFieldNumber.vue'
import SaplingDateTypeField from '@/components/dialog/fields/SaplingFieldDateType.vue'
import SaplingTimeField from '@/components/dialog/fields/SaplingFieldTime.vue'
import {
  buildRecurrenceRule,
  parseRecurrenceRule,
  type RecurrenceEndMode,
  type RecurrenceFrequency,
  type RecurrenceWeekdayCode,
  weekdayCodeFromDate,
} from '@/utils/eventRecurrence'

interface RecurrenceDraftState {
  frequency: 'NONE' | RecurrenceFrequency
  interval: number
  weekdays: RecurrenceWeekdayCode[]
  endMode: RecurrenceEndMode
  count: number | null
  untilDate: string
  untilTime: string
}

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

const dialog = ref(false)
const draftFrequency = ref<'NONE' | RecurrenceFrequency>('NONE')
const draftInterval = ref(1)
const draftWeekdays = ref<RecurrenceWeekdayCode[]>([])
const draftEndMode = ref<RecurrenceEndMode>('never')
const draftCount = ref<number | null>(null)
const draftUntilDate = ref('')
const draftUntilTime = ref('')

const frequencyOptions = computed(() => [
  { label: t('event.recurrenceNever'), value: 'NONE' as const },
  { label: t('event.recurrenceDaily'), value: 'DAILY' as const },
  { label: t('event.recurrenceWeekly'), value: 'WEEKLY' as const },
  { label: t('event.recurrenceMonthly'), value: 'MONTHLY' as const },
  { label: t('event.recurrenceYearly'), value: 'YEARLY' as const },
])

const endModeOptions = computed(() => [
  { label: t('event.recurrenceEndsNever'), value: 'never' as const },
  { label: t('event.recurrenceEndsOn'), value: 'until' as const },
  { label: t('event.recurrenceEndsAfter'), value: 'count' as const },
])

const weekdayOptions = computed(() =>
  [
    { value: 'MO' as const, label: t('event.monday') },
    { value: 'TU' as const, label: t('event.tuesday') },
    { value: 'WE' as const, label: t('event.wednesday') },
    { value: 'TH' as const, label: t('event.thursday') },
    { value: 'FR' as const, label: t('event.friday') },
    { value: 'SA' as const, label: t('event.saturday') },
    { value: 'SU' as const, label: t('event.sunday') },
  ].map((item) => ({
    ...item,
    shortLabel: item.label.slice(0, 2),
  })),
)

const fieldSummaryState = computed(() => createStateFromRule(props.modelValue))
const fieldSummaryParts = computed(() => buildSummaryParts(fieldSummaryState.value))
const fieldSummaryTitle = computed(() => fieldSummaryParts.value[0] || t('event.recurrenceNever'))
const fieldSummarySubtitle = computed(() => fieldSummaryParts.value.slice(1).join(' | '))

const draftSummaryState = computed<RecurrenceDraftState>(() => ({
  frequency: draftFrequency.value,
  interval: draftInterval.value,
  weekdays: [...draftWeekdays.value],
  endMode: draftEndMode.value,
  count: draftCount.value,
  untilDate: draftUntilDate.value,
  untilTime: draftUntilTime.value,
}))

const draftSummaryParts = computed(() => buildSummaryParts(draftSummaryState.value))
const draftSummaryLabel = computed(() => draftSummaryParts.value.join(' | '))
const draftSummaryTitle = computed(() => draftSummaryParts.value[0] || t('event.recurrenceNever'))

watch(
  () => props.modelValue,
  (value) => {
    if (!dialog.value) {
      hydrateDraft(value)
    }
  },
  { immediate: true },
)

function openDialog() {
  if (props.disabled) {
    return
  }

  hydrateDraft(props.modelValue)
  dialog.value = true
}

function closeDialog() {
  dialog.value = false
}

function saveDialog() {
  emit(
    'update:modelValue',
    buildRecurrenceRule({
      frequency: draftFrequency.value,
      interval: draftInterval.value,
      weekdays: draftWeekdays.value,
      endMode: draftEndMode.value,
      count: draftCount.value,
      untilDate: draftUntilDate.value,
      untilTime: draftUntilTime.value,
      startDate: props.startDateValue,
      startTime: props.startTimeValue,
      isAllDay: props.isAllDay,
    }),
  )

  dialog.value = false
}

function resetDraft() {
  hydrateDraft(null)
}

function hydrateDraft(value?: string | null) {
  const nextState = createStateFromRule(value)
  draftFrequency.value = nextState.frequency
  draftInterval.value = nextState.interval
  draftWeekdays.value = [...nextState.weekdays]
  draftEndMode.value = nextState.endMode
  draftCount.value = nextState.count
  draftUntilDate.value = nextState.untilDate
  draftUntilTime.value = nextState.untilTime
}

function createStateFromRule(value?: string | null): RecurrenceDraftState {
  const parsedRule = parseRecurrenceRule(value)
  if (!parsedRule) {
    return {
      frequency: 'NONE',
      interval: 1,
      weekdays: resolveDefaultWeekdays(),
      endMode: 'never',
      count: null,
      untilDate: '',
      untilTime: '',
    }
  }

  return {
    frequency: parsedRule.frequency,
    interval: parsedRule.interval,
    weekdays:
      parsedRule.byDay.length > 0 ? parsedRule.byDay : resolveDefaultWeekdays(parsedRule.frequency),
    endMode: parsedRule.count ? 'count' : parsedRule.until ? 'until' : 'never',
    count: parsedRule.count ?? null,
    untilDate: parsedRule.until ? formatLocalDate(parsedRule.until) : '',
    untilTime: parsedRule.until ? formatLocalTime(parsedRule.until) : '',
  }
}

function buildSummaryParts(state: RecurrenceDraftState): string[] {
  if (state.frequency === 'NONE') {
    return [t('event.recurrenceNever')]
  }

  const parts = [
    state.interval <= 1
      ? getFrequencyLabel(state.frequency)
      : `${t('event.recurrenceEvery')} ${state.interval} ${getFrequencyLabel(state.frequency)}`,
  ]

  if (state.frequency === 'WEEKLY' && state.weekdays.length > 0) {
    const weekdayLabels = weekdayOptions.value
      .filter((item) => state.weekdays.includes(item.value))
      .map((item) => item.label)

    if (weekdayLabels.length > 0) {
      parts.push(weekdayLabels.join(', '))
    }
  }

  if (state.endMode === 'count' && state.count) {
    parts.push(`${t('event.recurrenceEndsAfter')} ${state.count}`)
  }

  if (state.endMode === 'until' && state.untilDate) {
    parts.push(`${t('event.recurrenceEndsOn')} ${state.untilDate}`)
  }

  return parts
}

function selectFrequency(value: 'NONE' | RecurrenceFrequency) {
  draftFrequency.value = value

  if (value !== 'WEEKLY') {
    draftWeekdays.value = []
  }

  if (value === 'WEEKLY' && draftWeekdays.value.length === 0) {
    draftWeekdays.value = resolveDefaultWeekdays('WEEKLY')
  }

  if (value === 'NONE') {
    draftInterval.value = 1
    draftEndMode.value = 'never'
    draftCount.value = null
    draftUntilDate.value = ''
    draftUntilTime.value = ''
  }
}

function selectEndMode(value: RecurrenceEndMode) {
  draftEndMode.value = value

  if (value !== 'count') {
    draftCount.value = null
  }

  if (value !== 'until') {
    draftUntilDate.value = ''
    draftUntilTime.value = ''
  }
}

function toggleWeekday(value: RecurrenceWeekdayCode) {
  if (draftWeekdays.value.includes(value)) {
    draftWeekdays.value = draftWeekdays.value.filter((item) => item !== value)
    if (draftWeekdays.value.length > 0) {
      return
    }

    draftWeekdays.value = [value]
    return
  }

  draftWeekdays.value = [...draftWeekdays.value, value]
}

function onIntervalChange(value: unknown) {
  const nextValue = toPositiveInteger(value)
  draftInterval.value = Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 1
}

function onCountChange(value: unknown) {
  const nextValue = toPositiveInteger(value)
  draftCount.value = Number.isFinite(nextValue) && nextValue > 0 ? nextValue : null
}

function resolveDefaultWeekdays(
  nextFrequency?: 'WEEKLY' | RecurrenceFrequency,
): RecurrenceWeekdayCode[] {
  if (nextFrequency && nextFrequency !== 'WEEKLY') {
    return [] as RecurrenceWeekdayCode[]
  }

  const baseDate = parseDateInput(props.startDateValue)
  return baseDate ? [weekdayCodeFromDate(baseDate)] : ['MO' as const]
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

function toPositiveInteger(value: unknown) {
  if (typeof value === 'number') {
    return Math.trunc(value)
  }

  return Number.parseInt(stringifyValue(value), 10)
}
</script>
