<template>
  <v-container class="sapling-record-timeline pa-1 sapling-fill-shell" fluid>
    <div v-if="isLoading" class="sapling-record-timeline__loading">
      <v-skeleton-loader class="glass-panel" type="article, article, article" />
    </div>

    <template v-else>
      <SaplingPageHero
        v-if="anchor"
        class="sapling-record-timeline__hero"
        variant="workspace"
        :eyebrow="t('timeline.title')"
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
                <span>{{ t('timeline.month') }}</span>
                <strong>{{ months.length }}</strong>
              </article>
              <article class="sapling-record-timeline__hero-stat glass-panel">
                <span>{{ t('timeline.sections') }}</span>
                <strong>{{ timelineSectionCount }}</strong>
              </article>
            </div>

            <v-btn color="primary" variant="flat" prepend-icon="mdi-table-search" @click="openMainTable">
              {{ t('timeline.openRecord') }}
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
        <p>{{ t('timeline.empty') }}</p>
      </section>

      <v-timeline
        v-else
        class="sapling-record-timeline__timeline"
        align="start"
        justify="center"
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
          <div class="sapling-record-timeline__lane sapling-record-timeline__lane--body">
            <SaplingRecordTimelineMonthCard :month="month" @drilldown="openDrilldown" />
          </div>
        </v-timeline-item>

        <v-timeline-item
          v-if="!hasMore && months.length > 0"
          dot-color="primary"
          size="x-small"
          icon="mdi-check"
        >
          <div class="sapling-record-timeline__lane sapling-record-timeline__lane--body">
            <div class="sapling-record-timeline__timeline-end glass-panel">
              {{ t('timeline.noMoreMonths') }}
            </div>
          </div>
        </v-timeline-item>
      </v-timeline>

      <div ref="loadMoreTriggerRef" class="sapling-record-timeline__sentinel"></div>

      <div v-if="isLoadingMore" class="sapling-record-timeline__footer-state">
        <v-progress-circular indeterminate color="primary" size="22" width="3" />
        <span>{{ t('timeline.loadingMore') }}</span>
      </div>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SaplingPageHero from '@/components/common/SaplingPageHero.vue'
import SaplingRecordTimelineMonthCard from '@/components/timeline/SaplingRecordTimelineMonthCard.vue'
import { useSaplingRecordTimeline } from '@/composables/timeline/useSaplingRecordTimeline'
import { formatDateTimeValue } from '@/utils/saplingFormatUtil'

const { t } = useI18n()

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

  return entity.value?.title ?? entity.value?.handle ?? t('timeline.record')
})

const timelineSectionCount = computed(() =>
  months.value.reduce((total, month) => total + month.entities.length, 0),
)

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

function formatDateTime(value?: string | null) {
  return value ? formatDateTimeValue(value) : ''
}
</script>

<style scoped>
.sapling-record-timeline {
  display: flex;
  flex-direction: column;
  gap: var(--sapling-gap-xl);
  min-height: 0;
  padding-bottom: var(--sapling-space-panel-xl);
}

.sapling-record-timeline__loading {
  display: flex;
  flex-direction: column;
  gap: var(--sapling-gap-lg, 16px);
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

.sapling-record-timeline__hero-side,
.sapling-record-timeline__hero-stats {
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) min-content minmax(0, 1fr);
  width: 100%;
  max-width: none;
  padding: 0;
  border: 0;
  background: transparent;
}

.sapling-record-timeline__timeline:deep(.v-timeline-item__body) {
  display: flex;
  justify-self: stretch;
  min-width: 0;
  width: 100%;
  padding-inline-start: 22px;
}

.sapling-record-timeline__timeline:deep(.v-timeline-item__opposite) {
  display: flex;
  justify-self: stretch;
  min-width: 0;
  width: 100%;
  padding-inline-end: 22px;
}

.sapling-record-timeline__timeline:deep(.v-timeline-divider) {
  min-width: 56px;
}

.sapling-record-timeline__timeline:deep(.v-timeline-divider__before),
.sapling-record-timeline__timeline:deep(.v-timeline-divider__after) {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 28%, rgba(255, 255, 255, 0.1));
}

.sapling-record-timeline__timeline:deep(.v-timeline-item:not(:last-child)) {
  padding-bottom: 22px;
}

.sapling-record-timeline__lane {
  display: flex;
  width: 100%;
}

.sapling-record-timeline__lane--body {
  justify-content: stretch;
}

.sapling-record-timeline__timeline-end {
  width: 100%;
  padding: 14px 16px;
  border-radius: 16px;
  text-align: center;
  opacity: 0.78;
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
  .sapling-record-timeline__hero-stats {
    grid-template-columns: minmax(0, 1fr);
  }

  .sapling-record-timeline__timeline {
    grid-template-columns: min-content minmax(0, 1fr);
  }

  .sapling-record-timeline__timeline:deep(.v-timeline-item__opposite) {
    display: none;
  }

  .sapling-record-timeline__timeline:deep(.v-timeline-item__body) {
    padding-inline-start: 14px;
  }
}
</style>
