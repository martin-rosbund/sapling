<template>
  <v-dialog v-if="dialog" v-model="dialog" persistent class="sapling-dialog-large">
    <v-card
      class="glass-panel tilt-content sapling-inbox-dialog"
      v-tilt="TILT_DEFAULT_OPTIONS"
      elevation="12"
    >
      <SaplingDialogShell fill-shell body-class="sapling-inbox-dialog__body" :show-divider="false">
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
            :eyebrow="$t('navigation.inbox')"
            :title="$t('inbox.heroTitle')"
            :stats="heroStats"
            :stats-columns="3"
            stats-layout="compact"
          />
        </template>

        <template #body>
          <div class="sapling-inbox-dialog__content">
            <template v-if="isLoading">
              <section class="sapling-inbox-summary-grid">
                <v-skeleton-loader
                  v-for="item in 4"
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

              <section v-if="!hasInboxItems" class="sapling-inbox-empty-state glass-panel">
                <div class="sapling-inbox-empty-state__icon">
                  <v-icon icon="mdi-check-circle-outline" size="42" />
                </div>
                <h3 class="sapling-inbox-empty-state__title">{{ $t('inbox.allCaughtUpTitle') }}</h3>
                <p class="sapling-inbox-empty-state__copy">{{ $t('inbox.allCaughtUp') }}</p>
              </section>

              <section v-else class="sapling-inbox-board">
                <SaplingInboxSection
                  v-for="section in sections"
                  :key="section.key"
                  :section="section"
                  @open="openEntry"
                />
              </section>
            </template>
          </div>
        </template>

        <template #actions>
          <SaplingActionClose :close="closeDialog" />
        </template>
      </SaplingDialogShell>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
//#region Import
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSaplingInbox } from '@/composables/account/useSaplingInbox'
import SaplingActionClose from '@/components/actions/SaplingActionClose.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import SaplingDialogShell from '@/components/common/SaplingDialogShell.vue'
import SaplingInboxSection from '@/components/account/inbox/SaplingInboxSection.vue'
import SaplingInboxSummaryCard from '@/components/account/inbox/SaplingInboxSummaryCard.vue'
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants'
//#endregion

//#region Composable
const emit = defineEmits<{
  (event: 'close'): void
}>()

const { t } = useI18n()

const {
  isLoading,
  dialog,
  ticketEntries,
  taskEntries,
  salesOpportunityEntries,
  hasInboxItems,
  summaryCards,
  sections,
  openEntry,
  closeDialog,
} = useSaplingInbox(emit)

const heroStats = computed(() => [
  { label: t('navigation.ticket'), value: ticketEntries.value.length },
  { label: t('navigation.event'), value: taskEntries.value.length },
  { label: t('navigation.salesOpportunity'), value: salesOpportunityEntries.value.length },
])
//#endregion
</script>
