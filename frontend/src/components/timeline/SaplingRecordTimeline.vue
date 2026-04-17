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

<style scoped src="@/assets/styles/SaplingRecordTimeline.css"></style>
