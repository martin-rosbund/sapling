<template>
  <article
    class="sapling-section-panel sapling-history-card sapling-record-timeline-month-card glass-panel"
  >
    <div
      class="sapling-row-between-md sapling-row-wrap sapling-history-card__header sapling-record-timeline-month-card__header"
    >
      <div class="sapling-record-timeline-month-card__month-title">
        <span class="sapling-record-timeline-month-card__month-icon">
          <v-icon size="20">mdi-calendar-month-outline</v-icon>
        </span>
        <div>
          <h2>{{ month.label }}</h2>
        </div>
      </div>

      <div class="sapling-record-timeline-month-card__month-stats">
        <span class="sapling-record-timeline-month-card__metric">
          <strong>{{ monthRecordCount(month) }}</strong>
          <span>{{ t('timeline.records') }}</span>
        </span>
        <span class="sapling-record-timeline-month-card__metric">
          <strong>{{ month.entities.length }}</strong>
          <span>{{ t('timeline.sections') }}</span>
        </span>
      </div>
    </div>

    <div
      class="sapling-stack-xl sapling-history-card__stack sapling-record-timeline-month-card__entity-list"
    >
      <section
        v-for="summary in month.entities"
        :key="`${month.key}-${summary.entityHandle}-${summary.relationFields.join('-')}`"
        class="sapling-section-panel sapling-history-card__section sapling-record-timeline-month-card__entity glass-panel"
      >
        <div
          class="sapling-row-between-md sapling-row-wrap sapling-history-card__header sapling-record-timeline-month-card__entity-header"
        >
          <div class="sapling-record-timeline-month-card__entity-heading">
            <span class="sapling-record-timeline-month-card__entity-icon">
              <v-icon size="20">{{ summaryIcon(summary) }}</v-icon>
            </span>
            <div>
              <h3>{{ summaryHeading(summary) }}</h3>
              <p>{{ summaryDescription(summary) }}</p>
            </div>
          </div>

          <div
            class="sapling-chip-row sapling-history-card__chips sapling-record-timeline-month-card__entity-actions"
          >
            <v-btn
              v-if="summary.startCount > 0"
              variant="tonal"
              color="primary"
              size="small"
              prepend-icon="mdi-ray-start-arrow"
              @click="emit('drilldown', summary.entityHandle, summary.startFilter)"
            >
              {{ fieldLabel(summary.entityHandle, summary.startField) }} {{ summary.startCount }}
            </v-btn>
            <v-btn
              v-if="summary.endCount > 0"
              variant="tonal"
              color="primary"
              size="small"
              prepend-icon="mdi-ray-end-arrow"
              @click="emit('drilldown', summary.entityHandle, summary.endFilter)"
            >
              {{ fieldLabel(summary.entityHandle, summary.endField) }} {{ summary.endCount }}
            </v-btn>
          </div>
        </div>

        <div class="sapling-record-timeline-month-card__entity-insights">
          <span class="sapling-record-timeline-month-card__insight">
            <v-icon size="15">mdi-format-list-numbered</v-icon>
            <strong>{{ summary.count }}</strong>
            <span>{{ t('timeline.records') }}</span>
          </span>
          <span
            v-if="summaryAmountTotal(summary) != null"
            class="sapling-record-timeline-month-card__insight"
          >
            <v-icon size="15">mdi-cash-multiple</v-icon>
            <strong>{{ formatMoney(summaryAmountTotal(summary) ?? 0) }}</strong>
          </span>
        </div>

        <div
          v-if="summary.groups.length > 0"
          class="sapling-stack-xl sapling-history-card__stack sapling-record-timeline-month-card__groups"
        >
          <section
            v-for="group in summary.groups"
            :key="`${summary.entityHandle}-${group.field}`"
            class="sapling-stack-md sapling-history-card__group sapling-record-timeline-month-card__group"
          >
            <div class="sapling-record-timeline-month-card__group-header">
              <span class="sapling-eyebrow">{{
                groupLabel(summary.entityHandle, group.field, group.label)
              }}</span>
            </div>

            <div
              class="sapling-chip-row sapling-history-card__chips sapling-record-timeline-month-card__chips"
            >
              <button
                v-for="item in group.items"
                :key="`${group.field}-${item.key}`"
                class="sapling-soft-chip sapling-soft-chip--button sapling-history-card__chip-button sapling-record-timeline-month-card__chip-button"
                type="button"
                :title="`${groupLabel(summary.entityHandle, group.field, group.label)}: ${item.label}`"
                @click="emit('drilldown', summary.entityHandle, item.drilldownFilter)"
              >
                <span
                  class="sapling-row-xs sapling-history-card__chip-label sapling-record-timeline-month-card__chip-label-row"
                >
                  <v-icon v-if="item.icon" size="14">{{ item.icon }}</v-icon>
                  <span
                    class="sapling-history-card__chip-dot sapling-record-timeline-month-card__chip-dot"
                    :style="item.color ? { background: item.color } : undefined"
                  ></span>
                  <span>{{ item.label }}</span>
                </span>
                <strong>{{ item.count }}</strong>
                <span
                  v-if="item.amount != null"
                  class="sapling-history-card__chip-meta sapling-record-timeline-month-card__chip-amount"
                >
                  {{ formatMoney(item.amount) }}
                </span>
                <v-icon size="13" class="sapling-record-timeline-month-card__chip-action-icon">
                  mdi-filter-variant
                </v-icon>
              </button>
            </div>
          </section>
        </div>
      </section>

      <p
        v-if="month.entities.length === 0"
        class="sapling-inline-empty sapling-history-card__empty sapling-record-timeline-month-card__empty"
      >
        {{ t('timeline.noActivityInMonth') }}
      </p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useGenericStore } from '@/stores/genericStore'
import type { TimelineEntitySummary, TimelineMonth } from '@/entity/structure'

defineProps<{
  month: TimelineMonth
}>()

const emit = defineEmits<{
  drilldown: [entityHandle: string, filter: Record<string, unknown>]
}>()

const { t, locale } = useI18n()
const genericStore = useGenericStore()

function summaryLabel(label: string, entityHandle: string) {
  const translationKey = `navigation.${entityHandle}`
  const translated = t(translationKey)
  return translated !== translationKey ? translated : label
}

function summaryHeading(summary: TimelineEntitySummary) {
  const baseLabel = summaryLabel(summary.label, summary.entityHandle)

  if (summary.relationFields.length !== 1) {
    return baseLabel
  }

  return `${baseLabel} - ${fieldLabel(summary.entityHandle, summary.relationFields[0])}`
}

function groupLabel(entityHandle: string, fieldName: string, fallback: string) {
  const translationKey = `${entityHandle}.${fieldName}`
  const translated = t(translationKey)
  return translated !== translationKey ? translated : fallback
}

function fieldLabel(entityHandle: string, fieldName: string) {
  const translationKey = `${entityHandle}.${fieldName}`
  const translated = t(translationKey)
  return translated !== translationKey ? translated : formatFieldLabel(fieldName)
}

function formatFieldLabel(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function summaryDescription(summary: TimelineEntitySummary) {
  if (summary.relationFields.length === 1) {
    return `${t('timeline.referenceField')}: ${fieldLabel(summary.entityHandle, summary.relationFields[0])}`
  }

  if (summary.relationFields.length > 1) {
    return summary.relationFields.map((field) => fieldLabel(summary.entityHandle, field)).join(', ')
  }

  return t('timeline.records')
}

function formatMoney(value: number) {
  const currentLocale = locale.value === 'de' ? 'de-DE' : 'en-US'
  const currency = locale.value === 'de' ? 'EUR' : 'USD'
  return value.toLocaleString(currentLocale, { style: 'currency', currency })
}

function monthRecordCount(month: TimelineMonth) {
  return month.entities.reduce((total, summary) => total + summary.count, 0)
}

function summaryIcon(summary: TimelineEntitySummary) {
  return genericStore.getState(summary.entityHandle).entity?.icon || 'mdi-shape-outline'
}

function summaryAmountTotal(summary: TimelineEntitySummary) {
  const moneyGroup = summary.groups.find((group) =>
    group.items.some((item) => typeof item.amount === 'number'),
  )

  if (!moneyGroup) {
    return null
  }

  return moneyGroup.items.reduce((total, item) => total + (item.amount ?? 0), 0)
}
</script>
