<template>
  <v-dialog v-if="dialog" v-model="dialog" persistent class="sapling-dialog-large">
    <SaplingDialogCard class="sapling-inbox-dialog" :tilt="false">
      <SaplingDialogShell fill-shell body-class="sapling-inbox-dialog__body" :show-divider="false">
        <template #hero>
          <SaplingDialogHero
            v-if="isLoading"
            loading
            :loading-stats-count="4"
            :stats-columns="4"
            stats-layout="compact"
          />
          <SaplingDialogHero
            v-else
            :eyebrow="$t('navigation.inbox')"
            :title="$t('inbox.heroTitle')"
            :stats="heroStats"
            :stats-columns="4"
            stats-layout="compact"
          />
        </template>

        <template #body>
          <div class="sapling-inbox-dialog__content">
            <template v-if="isLoading">
              <section class="sapling-inbox-summary-grid">
                <v-skeleton-loader
                  v-for="item in 5"
                  :key="item"
                  class="sapling-inbox-loading-summary"
                  elevation="12"
                  type="article"
                />
              </section>

              <section class="sapling-inbox-board">
                <v-skeleton-loader
                  v-for="item in 5"
                  :key="item"
                  class="sapling-inbox-loading-section glass-panel"
                  elevation="12"
                  type="article, article"
                />
              </section>
            </template>

            <template v-else>
              <section class="sapling-inbox-summary-grid">
                <SaplingInboxSummaryCard
                  v-for="card in summaryCards"
                  :key="card.key"
                  :card="card"
                />
              </section>

              <section class="sapling-inbox-view-switch glass-panel">
                <v-btn-toggle
                  v-model="activeView"
                  class="sapling-inbox-view-switch__toggle"
                  color="primary"
                  divided
                  mandatory
                >
                  <v-btn value="overview" class="sapling-inbox-view-switch__button glass-panel">
                    <span class="sapling-inbox-view-switch__button-label">
                      <v-icon icon="mdi-view-dashboard-outline" size="18" />
                      <span>{{ $t('navigation.inbox') }}</span>
                    </span>
                    <span
                      class="sapling-inbox-view-switch__count sapling-inbox-view-switch__count--idle"
                    >
                      {{ overviewCount }}
                    </span>
                  </v-btn>
                  <v-btn
                    value="notifications"
                    class="sapling-inbox-view-switch__button glass-panel"
                  >
                    <span class="sapling-inbox-view-switch__button-label">
                      <v-icon icon="mdi-bell-outline" size="18" />
                      <span>{{ $t('navigation.inboxNotification') }}</span>
                    </span>
                    <span
                      :class="[
                        'sapling-inbox-view-switch__count',
                        hasUnreadNotifications
                          ? 'sapling-inbox-view-switch__count--alert'
                          : 'sapling-inbox-view-switch__count--idle',
                      ]"
                    >
                      {{ notificationEntries.length }}
                    </span>
                  </v-btn>
                </v-btn-toggle>
              </section>

              <template v-if="activeView === 'overview'">
                <section v-if="!hasOverviewItems" class="sapling-inbox-empty-state glass-panel">
                  <div class="sapling-inbox-empty-state__icon">
                    <v-icon icon="mdi-check-circle-outline" size="42" />
                  </div>
                  <h3 class="sapling-inbox-empty-state__title">
                    {{ $t('inbox.allCaughtUpTitle') }}
                  </h3>
                  <p class="sapling-inbox-empty-state__copy">{{ $t('inbox.allCaughtUp') }}</p>
                </section>

                <section v-else class="sapling-inbox-board">
                  <SaplingInboxSection
                    v-for="section in sections"
                    :key="section.key"
                    :section="section"
                    @open="openEntry"
                    @dismiss="dismissEntry"
                  />
                </section>
              </template>

              <template v-else>
                <section v-if="!hasNotificationItems" class="sapling-inbox-empty-state glass-panel">
                  <div class="sapling-inbox-empty-state__icon">
                    <v-icon icon="mdi-check-circle-outline" size="42" />
                  </div>
                  <h3 class="sapling-inbox-empty-state__title">
                    {{ $t('inbox.allCaughtUpTitle') }}
                  </h3>
                  <p class="sapling-inbox-empty-state__copy">{{ $t('inbox.allCaughtUp') }}</p>
                </section>

                <section v-else class="sapling-inbox-notification-panel glass-panel">
                  <div class="sapling-inbox-notification-panel__header">
                    <div class="sapling-inbox-notification-panel__title-row">
                      <div class="sapling-inbox-notification-panel__icon-wrap">
                        <v-icon icon="mdi-bell-outline" size="18" />
                      </div>
                      <h3 class="sapling-inbox-notification-panel__title">
                        {{ $t('navigation.inboxNotification') }}
                      </h3>
                    </div>
                    <v-chip size="small" variant="tonal" color="info">
                      {{ sortedNotificationEntries.length }}
                    </v-chip>
                  </div>

                  <div class="sapling-inbox-notification-feed">
                    <SaplingInboxEntryCard
                      v-for="entry in sortedNotificationEntries"
                      :key="entry.id"
                      :entry="entry"
                      expanded
                      @open="openEntry"
                      @dismiss="dismissEntry"
                    />
                  </div>
                </section>
              </template>
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
//#region Import
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSaplingInbox, type InboxEntry } from '@/composables/account/useSaplingInbox'
import SaplingActionClose from '@/components/actions/SaplingActionClose.vue'
import SaplingDialogCard from '@/components/dialog/SaplingDialogCard.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import SaplingDialogShell from '@/components/common/SaplingDialogShell.vue'
import SaplingInboxEntryCard from '@/components/account/inbox/SaplingInboxEntryCard.vue'
import SaplingInboxSection from '@/components/account/inbox/SaplingInboxSection.vue'
import SaplingInboxSummaryCard from '@/components/account/inbox/SaplingInboxSummaryCard.vue'
//#endregion

//#region Composable
const emit = defineEmits<{
  (event: 'close'): void
}>()

const { t } = useI18n()
const activeView = ref<'overview' | 'notifications'>('overview')

const {
  isLoading,
  dialog,
  notificationEntries,
  ticketEntries,
  taskEntries,
  salesOpportunityEntries,
  summaryCards,
  sections,
  openEntry,
  dismissEntry,
  closeDialog,
} = useSaplingInbox(emit)

const overviewCount = computed(
  () =>
    ticketEntries.value.length + taskEntries.value.length + salesOpportunityEntries.value.length,
)
const hasOverviewItems = computed(() => overviewCount.value > 0)
const hasUnreadNotifications = computed(() => notificationEntries.value.length > 0)
const sortedNotificationEntries = computed<InboxEntry[]>(() =>
  [...notificationEntries.value].sort((left, right) => {
    const leftTime = left.dateValue?.getTime() ?? Number.MIN_SAFE_INTEGER
    const rightTime = right.dateValue?.getTime() ?? Number.MIN_SAFE_INTEGER

    if (leftTime !== rightTime) {
      return rightTime - leftTime
    }

    return left.title.localeCompare(right.title)
  }),
)
const hasNotificationItems = computed(() => sortedNotificationEntries.value.length > 0)

const heroStats = computed(() => [
  { label: t('navigation.inboxNotification'), value: notificationEntries.value.length },
  { label: t('navigation.ticket'), value: ticketEntries.value.length },
  { label: t('navigation.event'), value: taskEntries.value.length },
  { label: t('navigation.salesOpportunity'), value: salesOpportunityEntries.value.length },
])
//#endregion
</script>
