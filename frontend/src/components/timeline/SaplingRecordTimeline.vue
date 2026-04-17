<template>
  <section class="sapling-record-timeline sapling-fill-shell">
    <div v-if="isLoading" class="sapling-record-timeline__loading">
      <v-skeleton-loader class="glass-panel" type="article, article, article" />
    </div>

    <template v-else>
      <SaplingPageHero
        v-if="anchor"
        class="sapling-record-timeline__hero"
        variant="workspace"
        :eyebrow="translate('timeline.title', 'Timeline')"
        :title="anchor.label"
        :subtitle="`${entityLabel} · ${anchor.entityHandle} · #${anchor.handle}`"
      >
        <template #title-prefix>
          <div class="sapling-record-timeline__hero-icon-wrap">
            <v-icon size="28">{{ entity?.icon || 'mdi-timeline-outline' }}</v-icon>
          </div>
        </template>

        <template #meta>
          <v-chip v-if="anchor.startAt" size="small" variant="tonal" color="primary">
            {{ fieldLabel(anchor.entityHandle, anchor.startField) }} {{ formatDateTime(anchor.startAt) }}
          </v-chip>
          <v-chip v-if="anchor.endAt" size="small" variant="outlined" color="primary">
            {{ fieldLabel(anchor.entityHandle, anchor.endField) }} {{ formatDateTime(anchor.endAt) }}
          </v-chip>
        </template>

        <template #side>
          <div class="sapling-record-timeline__hero-side">
            <div class="sapling-record-timeline__hero-stats">
              <article class="sapling-record-timeline__hero-stat glass-panel">
                <span>{{ translate('timeline.month', 'Monat') }}</span>
                <strong>{{ months.length }}</strong>
              </article>
              <article class="sapling-record-timeline__hero-stat glass-panel">
                <span>{{ translate('timeline.sections', 'Bereiche') }}</span>
                <strong>{{ timelineSectionCount }}</strong>
              </article>
            </div>

            <v-btn color="primary" variant="flat" prepend-icon="mdi-table-search" @click="openMainTable">
              {{ translate('timeline.openRecord', 'Datensatz öffnen') }}
            </v-btn>
          </div>
        </template>
      </SaplingPageHero>

      <section v-if="error" class="sapling-record-timeline__empty glass-panel sapling-empty-state-panel">
        <v-icon size="42">mdi-alert-circle-outline</v-icon>
        <p>{{ error }}</p>
      </section>

      <section
        v-else-if="months.length === 0"
        class="sapling-record-timeline__empty glass-panel sapling-empty-state-panel"
      >
        <v-icon size="42">mdi-timeline-text-outline</v-icon>
        <p>{{ translate('timeline.empty', 'Keine verknüpften Aktivitäten gefunden.') }}</p>
      </section>

      <v-timeline
        v-else
        class="sapling-record-timeline__timeline"
        side="end"
        density="compact"
        line-inset="12"
        truncate-line="both"
      >
        <v-timeline-item
          v-for="month in months"
          :key="month.key"
          dot-color="primary"
          fill-dot
          size="small"
          icon="mdi-calendar-month-outline"
        >
          <template #opposite>
            <div class="sapling-record-timeline__opposite">
              <span class="sapling-eyebrow">{{ translate('timeline.month', 'Monat') }}</span>
              <strong>{{ month.label }}</strong>
            </div>
          </template>

          <article class="sapling-record-timeline__month glass-panel">
            <div class="sapling-record-timeline__month-header">
              <div>
                <h2>{{ month.label }}</h2>
                <p>{{ month.entities.length }} {{ translate('timeline.sections', 'Bereiche') }}</p>
              </div>
            </div>

            <div class="sapling-record-timeline__entity-list">
              <section
                v-for="summary in month.entities"
                :key="`${month.key}-${summary.entityHandle}-${summary.relationFields.join('-')}`"
                class="sapling-record-timeline__entity glass-panel"
              >
                <div class="sapling-record-timeline__entity-header">
                  <div>
                    <h3>{{ summaryHeading(summary) }}</h3>
                    <p>{{ summaryDescription(summary) }}</p>
                  </div>

                  <div class="sapling-record-timeline__entity-actions">
                    <v-btn
                      v-if="summary.startCount > 0"
                      variant="text"
                      color="primary"
                      @click="openDrilldown(summary.entityHandle, summary.startFilter)"
                    >
                      {{ fieldLabel(summary.entityHandle, summary.startField) }} {{ summary.startCount }}
                    </v-btn>
                    <v-btn
                      v-if="summary.endCount > 0"
                      variant="text"
                      color="primary"
                      @click="openDrilldown(summary.entityHandle, summary.endFilter)"
                    >
                      {{ fieldLabel(summary.entityHandle, summary.endField) }} {{ summary.endCount }}
                    </v-btn>
                  </div>
                </div>

                <div v-if="summary.groups.length > 0" class="sapling-record-timeline__groups">
                  <section
                    v-for="group in summary.groups"
                    :key="`${summary.entityHandle}-${group.field}`"
                    class="sapling-record-timeline__group"
                  >
                    <div class="sapling-record-timeline__group-header">
                      <span class="sapling-eyebrow">{{ groupLabel(summary.entityHandle, group.field, group.label) }}</span>
                    </div>

                    <div class="sapling-record-timeline__chips">
                      <button
                        v-for="item in group.items"
                        :key="`${group.field}-${item.key}`"
                        class="sapling-record-timeline__chip-button"
                        type="button"
                        @click="openDrilldown(summary.entityHandle, item.drilldownFilter)"
                      >
                        <span class="sapling-record-timeline__chip-label-row">
                          <v-icon v-if="item.icon" size="14">{{ item.icon }}</v-icon>
                          <span
                            class="sapling-record-timeline__chip-dot"
                            :style="item.color ? { background: item.color } : undefined"
                          ></span>
                          <span>{{ item.label }}</span>
                        </span>
                        <strong>{{ item.count }}</strong>
                        <span v-if="item.amount != null" class="sapling-record-timeline__chip-amount">
                          {{ formatMoney(item.amount) }}
                        </span>
                      </button>
                    </div>
                  </section>
                </div>
              </section>

              <p v-if="month.entities.length === 0" class="sapling-record-timeline__month-empty">
                {{ translate('timeline.noActivityInMonth', 'Keine Aktivitäten in diesem Monat.') }}
              </p>
            </div>
          </article>
        </v-timeline-item>
      </v-timeline>

      <div ref="loadMoreTriggerRef" class="sapling-record-timeline__sentinel"></div>

      <div v-if="isLoadingMore" class="sapling-record-timeline__footer-state">
        <v-progress-circular indeterminate color="primary" size="22" width="3" />
        <span>{{ translate('timeline.loadingMore', 'Weitere Monate werden geladen...') }}</span>
      </div>
      <div v-else-if="!hasMore && months.length > 0" class="sapling-record-timeline__footer-state">
        <span>{{ translate('timeline.noMoreMonths', 'Keine weiteren Monate verfuegbar.') }}</span>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TimelineEntitySummary } from '@/entity/structure'
import SaplingPageHero from '@/components/common/SaplingPageHero.vue'
import { formatDateTimeValue } from '@/utils/saplingFormatUtil'
import { useSaplingRecordTimeline } from '@/composables/timeline/useSaplingRecordTimeline'

const { t, locale } = useI18n()

const {
  entity,
  anchor,
  months,
  error,
  hasMore,
  isLoading,
  isLoadingMore,
  loadMoreTriggerRef,
  openMainTable,
  openDrilldown,
} = useSaplingRecordTimeline()

const entityLabel = computed(() => {
  const translationKey = `navigation.${entity.value?.handle ?? ''}`
  const translated = entity.value?.handle ? t(translationKey) : ''
  if (translated && translated !== translationKey) {
    return translated
  }

  return entity.value?.title ?? entity.value?.handle ?? translate('timeline.record', 'Datensatz')
})

const timelineSectionCount = computed(() =>
  months.value.reduce((total, month) => total + month.entities.length, 0),
)

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

function translate(key: string, fallback: string) {
  const translated = t(key)
  return translated !== key ? translated : fallback
}

function summaryDescription(summary: TimelineEntitySummary) {
  const datasetWord = translate('timeline.records', 'Datensaetze')

  if (summary.relationFields.length === 1) {
    return `${summary.count} ${datasetWord} · ${translate('timeline.referenceField', 'Bezugsfeld')}: ${fieldLabel(summary.entityHandle, summary.relationFields[0])}`
  }

  if (summary.relationFields.length > 1) {
    return `${summary.count} ${datasetWord} · ${summary.relationFields.map((field) => fieldLabel(summary.entityHandle, field)).join(', ')}`
  }

  return `${summary.count} ${datasetWord}`
}

function formatDateTime(value?: string | null) {
  return value ? formatDateTimeValue(value) : ''
}

function formatMoney(value: number) {
  const currentLocale = locale.value === 'de' ? 'de-DE' : 'en-US'
  const currency = locale.value === 'de' ? 'EUR' : 'USD'
  return value.toLocaleString(currentLocale, { style: 'currency', currency })
}
</script>

<style scoped>
.sapling-record-timeline {
  display: flex;
  flex-direction: column;
  gap: var(--sapling-gap-lg, 16px);
  min-height: 0;
}

.sapling-record-timeline__loading {
  display: flex;
  flex-direction: column;
  gap: var(--sapling-gap-lg, 16px);
}

.sapling-record-timeline__hero,
.sapling-record-timeline__month,
.sapling-record-timeline__entity {
  border: 1px solid var(--sapling-surface-border, rgba(255, 255, 255, 0.08));
  border-radius: 16px;
}

.sapling-record-timeline__month,
.sapling-record-timeline__entity {
  padding: 16px;
}

.sapling-record-timeline__hero {
  border: 0;
}

.sapling-record-timeline__hero-icon-wrap {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.04)),
    color-mix(in srgb, rgb(var(--v-theme-primary)) 18%, transparent);
  color: rgb(var(--v-theme-primary));
}

.sapling-record-timeline__subtitle,
.sapling-record-timeline__entity-header p {
  margin: 4px 0 0;
  opacity: 0.72;
}

.sapling-record-timeline__hero-side,
.sapling-record-timeline__hero-stats,
.sapling-record-timeline__entity-actions,
.sapling-record-timeline__chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.sapling-record-timeline__hero-side {
  flex-direction: column;
  align-items: stretch;
  width: min(320px, 100%);
}

.sapling-record-timeline__hero-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.sapling-record-timeline__hero-stat {
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: center;
  min-height: 88px;
  padding: 14px 16px;
  border-radius: 16px;
}

.sapling-record-timeline__hero-stat span {
  font-size: 0.8rem;
  opacity: 0.72;
}

.sapling-record-timeline__hero-stat strong {
  font-size: 1.5rem;
  line-height: 1;
}

.sapling-record-timeline__timeline {
  width: 100%;
  max-width: none;
  padding: 0;
  border: 0;
  background: transparent;
}

.sapling-record-timeline__timeline:deep(.v-timeline-item__body) {
  max-width: none;
  padding-inline-start: 20px;
}

.sapling-record-timeline__timeline:deep(.v-timeline-item__opposite) {
  flex: 0 0 132px;
  padding-inline-end: 20px;
}

.sapling-record-timeline__timeline:deep(.v-timeline-divider) {
  min-width: 52px;
}

.sapling-record-timeline__timeline:deep(.v-timeline-divider__before),
.sapling-record-timeline__timeline:deep(.v-timeline-divider__after) {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 28%, rgba(255, 255, 255, 0.1));
}

.sapling-record-timeline__timeline:deep(.v-timeline-item:not(:last-child)) {
  padding-bottom: 18px;
}

.sapling-record-timeline__month-header,
.sapling-record-timeline__entity-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.sapling-record-timeline__opposite {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
  text-align: right;
  min-width: 92px;
}

.sapling-record-timeline__entity-list,
.sapling-record-timeline__groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.sapling-record-timeline__month {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)),
    var(--sapling-surface-fill, rgba(255, 255, 255, 0.04));
  box-shadow: var(--sapling-inset-highlight);
}

.sapling-record-timeline__entity {
  background: color-mix(in srgb, var(--sapling-surface-fill, rgba(255, 255, 255, 0.04)) 92%, transparent);
}

.sapling-record-timeline__group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sapling-record-timeline__month-empty {
  margin: 0;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px dashed var(--sapling-surface-border-accent, rgba(255, 255, 255, 0.16));
  opacity: 0.72;
}

.sapling-record-timeline__chip-button {
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

.sapling-record-timeline__chip-button:hover {
  border-color: rgba(76, 175, 80, 0.5);
}

.sapling-record-timeline__chip-label-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sapling-record-timeline__chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.55;
}

.sapling-record-timeline__chip-amount {
  opacity: 0.72;
}

.sapling-record-timeline__empty,
.sapling-record-timeline__footer-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 120px;
  text-align: center;
}

.sapling-record-timeline__sentinel {
  width: 100%;
  height: 1px;
}

@media (max-width: 768px) {
  .sapling-record-timeline__month-header,
  .sapling-record-timeline__entity-header {
    flex-direction: column;
  }

  .sapling-record-timeline__hero-stats {
    grid-template-columns: minmax(0, 1fr);
  }

  .sapling-record-timeline__opposite {
    display: none;
  }

  .sapling-record-timeline__timeline:deep(.v-timeline-item__body) {
    padding-inline-start: 14px;
  }

  .sapling-record-timeline__chip-button {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
