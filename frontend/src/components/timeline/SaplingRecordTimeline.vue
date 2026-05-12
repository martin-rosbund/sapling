<template>
  <v-dialog v-if="dialog" v-model="dialogModel" persistent class="sapling-dialog-large">
    <SaplingDialogCard class="sapling-inbox-dialog sapling-record-timeline-dialog">
      <SaplingDialogShell
        fill-shell
        body-class="sapling-inbox-dialog__body sapling-record-timeline-dialog__body"
        :show-divider="false"
      >
        <template #hero>
          <SaplingDialogHero
            v-if="isLoading"
            loading
            :loading-stats-count="3"
            :stats-columns="3"
            stats-layout="compact"
          />
          <SaplingDialogHero
            v-else
            :eyebrow="t('timeline.title')"
            :title="anchor?.label"
            :stats="heroStats"
            :stats-columns="3"
            stats-layout="compact"
          >
          </SaplingDialogHero>
        </template>

        <template #body>
          <div class="sapling-inbox-dialog__content sapling-record-timeline-dialog__content">
            <template v-if="isLoading">
              <section class="sapling-record-timeline__summary-grid">
                <v-skeleton-loader
                  v-for="item in 3"
                  :key="item"
                  class="sapling-record-timeline__loading-summary"
                  elevation="12"
                  type="article"
                />
              </section>

              <section class="sapling-record-timeline__loading">
                <v-skeleton-loader
                  v-for="item in 3"
                  :key="`loading-${item}`"
                  class="sapling-record-timeline__loading-section glass-panel"
                  elevation="12"
                  type="article, article"
                />
              </section>
            </template>

            <template v-else>
              <section v-if="summaryCards.length > 0" class="sapling-record-timeline__summary-grid">
                <article
                  v-for="card in summaryCards"
                  :key="card.key"
                  class="sapling-record-timeline__summary-card glass-panel"
                >
                  <div class="sapling-record-timeline__summary-card-header">
                    <div>
                      <div class="sapling-record-timeline__summary-card-label">
                        {{ card.label }}
                      </div>
                      <strong class="sapling-record-timeline__summary-card-value">{{
                        card.value
                      }}</strong>
                    </div>
                    <v-icon :icon="card.icon" size="22" />
                  </div>
                </article>
              </section>

              <section
                v-if="error"
                class="sapling-record-timeline__empty glass-panel sapling-empty-state-panel"
              >
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

              <div v-else-if="smAndDown" class="sapling-record-timeline__mobile-list">
                <article
                  v-for="month in months"
                  :key="month.key"
                  class="sapling-record-timeline__mobile-item"
                >
                  <div class="sapling-record-timeline__mobile-divider" aria-hidden="true">
                    <span class="sapling-record-timeline__mobile-dot">
                      <v-icon size="16">mdi-calendar-month-outline</v-icon>
                    </span>
                  </div>

                  <div class="sapling-record-timeline__mobile-body">
                    <SaplingRecordTimelineMonthCard :month="month" @drilldown="openDrilldown" />
                  </div>
                </article>

                <article
                  v-if="!hasMore && months.length > 0"
                  class="sapling-record-timeline__mobile-item sapling-record-timeline__mobile-item--end"
                >
                  <div class="sapling-record-timeline__mobile-divider" aria-hidden="true">
                    <span
                      class="sapling-record-timeline__mobile-dot sapling-record-timeline__mobile-dot--end"
                    >
                      <v-icon size="14">mdi-check</v-icon>
                    </span>
                  </div>

                  <div class="sapling-record-timeline__mobile-body">
                    <div class="sapling-record-timeline__timeline-end glass-panel">
                      {{ t('timeline.noMoreMonths') }}
                    </div>
                  </div>
                </article>
              </div>

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
          </div>
        </template>

        <template #actions>
          <SaplingActionClose :close="closeDialog" />
        </template>
      </SaplingDialogShell>
    </SaplingDialogCard>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import SaplingActionClose from '@/components/actions/SaplingActionClose.vue'
import SaplingDialogCard from '@/components/dialog/SaplingDialogCard.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import SaplingDialogShell from '@/components/common/SaplingDialogShell.vue'
import SaplingRecordTimelineMonthCard from '@/components/timeline/SaplingRecordTimelineMonthCard.vue'
import { useSaplingRecordTimeline } from '@/composables/timeline/useSaplingRecordTimeline'
import { useTimelineDialogStore } from '@/stores/timelineDialogStore'
import { formatDateTimeValue } from '@/utils/saplingFormatUtil'

const { t } = useI18n()
const { smAndDown } = useDisplay()
const timelineDialogStore = useTimelineDialogStore()
const { dialog, entityHandle, recordHandle } = storeToRefs(timelineDialogStore)

const dialogModel = computed({
  get: () => dialog.value,
  set: (value: boolean) => {
    if (!value) {
      timelineDialogStore.closeTimeline()
    }
  },
})

const {
  entity,
  anchor,
  months,
  error,
  hasMore,
  isLoading,
  isLoadingMore,
  loadMoreTriggerRef,
  openDrilldown,
} = useSaplingRecordTimeline({
  entityHandle,
  recordHandle,
  active: dialog,
  onNavigate: () => timelineDialogStore.closeTimeline(),
})

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

const heroStats = computed(() => [
  { label: t('timeline.record'), value: anchor.value ? `#${anchor.value.handle}` : '-' },
  { label: t('timeline.month'), value: months.value.length },
  { label: t('timeline.sections'), value: timelineSectionCount.value },
])

const summaryCards = computed(() => {
  if (!anchor.value) {
    return []
  }

  const cards = [
    {
      key: 'entity',
      label: entityLabel.value,
      value: anchor.value.entityHandle,
      icon: entity.value?.icon || 'mdi-shape-outline',
    },
    {
      key: 'record',
      label: t('timeline.record'),
      value: `#${anchor.value.handle}`,
      icon: 'mdi-pound',
    },
  ]

  if (anchor.value.startAt) {
    cards.push({
      key: 'startAt',
      label: fieldLabel(anchor.value.entityHandle, anchor.value.startField),
      value: formatDateTime(anchor.value.startAt),
      icon: 'mdi-calendar-start',
    })
  }

  if (anchor.value.endAt) {
    cards.push({
      key: 'endAt',
      label: fieldLabel(anchor.value.entityHandle, anchor.value.endField),
      value: formatDateTime(anchor.value.endAt),
      icon: 'mdi-calendar-end',
    })
  }

  return cards
})

function closeDialog() {
  timelineDialogStore.closeTimeline()
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

function formatDateTime(value?: string | null) {
  return value ? formatDateTimeValue(value) : ''
}
</script>
