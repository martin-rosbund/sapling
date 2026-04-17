<template>
  <article class="sapling-record-timeline-month-card glass-panel">
    <div class="sapling-record-timeline-month-card__header">
      <div>
        <h2>{{ month.label }}</h2>
        <p>{{ month.entities.length }} {{ t('timeline.sections') }}</p>
      </div>
    </div>

    <div class="sapling-record-timeline-month-card__entity-list">
      <section
        v-for="summary in month.entities"
        :key="`${month.key}-${summary.entityHandle}-${summary.relationFields.join('-')}`"
        class="sapling-record-timeline-month-card__entity glass-panel"
      >
        <div class="sapling-record-timeline-month-card__entity-header">
          <div>
            <h3>{{ summaryHeading(summary) }}</h3>
            <p>{{ summaryDescription(summary) }}</p>
          </div>

          <div class="sapling-record-timeline-month-card__entity-actions">
            <v-btn
              v-if="summary.startCount > 0"
              variant="text"
              color="primary"
              @click="emit('drilldown', summary.entityHandle, summary.startFilter)"
            >
              {{ fieldLabel(summary.entityHandle, summary.startField) }} {{ summary.startCount }}
            </v-btn>
            <v-btn
              v-if="summary.endCount > 0"
              variant="text"
              color="primary"
              @click="emit('drilldown', summary.entityHandle, summary.endFilter)"
            >
              {{ fieldLabel(summary.entityHandle, summary.endField) }} {{ summary.endCount }}
            </v-btn>
          </div>
        </div>

        <div v-if="summary.groups.length > 0" class="sapling-record-timeline-month-card__groups">
          <section
            v-for="group in summary.groups"
            :key="`${summary.entityHandle}-${group.field}`"
            class="sapling-record-timeline-month-card__group"
          >
            <div class="sapling-record-timeline-month-card__group-header">
              <span class="sapling-eyebrow">{{ groupLabel(summary.entityHandle, group.field, group.label) }}</span>
            </div>

            <div class="sapling-record-timeline-month-card__chips">
              <button
                v-for="item in group.items"
                :key="`${group.field}-${item.key}`"
                class="sapling-record-timeline-month-card__chip-button"
                type="button"
                @click="emit('drilldown', summary.entityHandle, item.drilldownFilter)"
              >
                <span class="sapling-record-timeline-month-card__chip-label-row">
                  <v-icon v-if="item.icon" size="14">{{ item.icon }}</v-icon>
                  <span
                    class="sapling-record-timeline-month-card__chip-dot"
                    :style="item.color ? { background: item.color } : undefined"
                  ></span>
                  <span>{{ item.label }}</span>
                </span>
                <strong>{{ item.count }}</strong>
                <span v-if="item.amount != null" class="sapling-record-timeline-month-card__chip-amount">
                  {{ formatMoney(item.amount) }}
                </span>
              </button>
            </div>
          </section>
        </div>
      </section>

      <p v-if="month.entities.length === 0" class="sapling-record-timeline-month-card__empty">
        {{ t('timeline.noActivityInMonth') }}
      </p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { TimelineEntitySummary, TimelineMonth } from '@/entity/structure'

defineProps<{
  month: TimelineMonth
}>()

const emit = defineEmits<{
  drilldown: [entityHandle: string, filter: Record<string, unknown>]
}>()

const { t, locale } = useI18n()

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

  return `${baseLabel} · ${fieldLabel(summary.entityHandle, summary.relationFields[0])}`
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
  const datasetWord = t('timeline.records')

  if (summary.relationFields.length === 1) {
    return `${summary.count} ${datasetWord} · ${t('timeline.referenceField')}: ${fieldLabel(summary.entityHandle, summary.relationFields[0])}`
  }

  if (summary.relationFields.length > 1) {
    return `${summary.count} ${datasetWord} · ${summary.relationFields.map((field) => fieldLabel(summary.entityHandle, field)).join(', ')}`
  }

  return `${summary.count} ${datasetWord}`
}

function formatMoney(value: number) {
  const currentLocale = locale.value === 'de' ? 'de-DE' : 'en-US'
  const currency = locale.value === 'de' ? 'EUR' : 'USD'
  return value.toLocaleString(currentLocale, { style: 'currency', currency })
}
</script>

<style scoped>
.sapling-record-timeline-month-card {
  box-sizing: border-box;
  width: 100%;
  max-width: none;
  padding: 16px;
  border: 1px solid var(--sapling-surface-border, rgba(255, 255, 255, 0.08));
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)),
    var(--sapling-surface-fill, rgba(255, 255, 255, 0.04));
  box-shadow: var(--sapling-inset-highlight);
}

.sapling-record-timeline-month-card__header,
.sapling-record-timeline-month-card__entity-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.sapling-record-timeline-month-card__entity-header p {
  margin: 4px 0 0;
  opacity: 0.72;
}

.sapling-record-timeline-month-card__entity-list,
.sapling-record-timeline-month-card__groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.sapling-record-timeline-month-card__entity {
  padding: 16px;
  border: 1px solid var(--sapling-surface-border, rgba(255, 255, 255, 0.08));
  border-radius: 16px;
  background: color-mix(in srgb, var(--sapling-surface-fill, rgba(255, 255, 255, 0.04)) 92%, transparent);
}

.sapling-record-timeline-month-card__group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sapling-record-timeline-month-card__entity-actions,
.sapling-record-timeline-month-card__chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.sapling-record-timeline-month-card__chip-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 999px;
  border: 1px solid var(--sapling-surface-border-accent, rgba(255, 255, 255, 0.16));
  background: color-mix(in srgb, var(--sapling-surface-fill, rgba(255, 255, 255, 0.04)) 88%, transparent);
  color: inherit;
  cursor: pointer;
}

.sapling-record-timeline-month-card__chip-button:hover {
  border-color: rgba(76, 175, 80, 0.5);
}

.sapling-record-timeline-month-card__chip-label-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sapling-record-timeline-month-card__chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.55;
}

.sapling-record-timeline-month-card__chip-amount {
  opacity: 0.72;
}

.sapling-record-timeline-month-card__empty {
  margin: 0;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px dashed var(--sapling-surface-border-accent, rgba(255, 255, 255, 0.16));
  opacity: 0.72;
}

@media (max-width: 768px) {
  .sapling-record-timeline-month-card__header,
  .sapling-record-timeline-month-card__entity-header {
    flex-direction: column;
  }

  .sapling-record-timeline-month-card__chip-button {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
