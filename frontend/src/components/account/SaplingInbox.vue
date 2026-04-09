<template>
  <v-dialog v-if="dialog" v-model="dialog" persistent class="sapling-dialog-large">
    <v-card class="glass-panel tilt-content sapling-inbox-dialog" v-tilt="TILT_SOFT_OPTIONS" elevation="12">
      <div class="sapling-inbox-shell sapling-fill-shell">
        <template v-if="isLoading">
          <section class="sapling-inbox-hero">
            <div class="sapling-inbox-hero__copy sapling-inbox-loading-copy">
              <v-skeleton-loader type="heading, text" />
            </div>

            <div class="sapling-inbox-hero__stats">
              <v-skeleton-loader v-for="item in 2" :key="item" class="sapling-inbox-loading-stat" type="article" />
            </div>
          </section>

          <section class="sapling-inbox-summary-grid">
            <v-skeleton-loader
              v-for="item in 3"
              :key="item"
              class="sapling-inbox-loading-summary"
              elevation="12"
              type="list-item-avatar"
            />
          </section>

          <section class="sapling-inbox-sections">
            <v-skeleton-loader
              v-for="item in 2"
              :key="item"
              class="sapling-inbox-loading-section glass-panel"
              elevation="12"
              type="article, article"
            />
          </section>
        </template>
        <template v-else>
          <section class="sapling-inbox-hero">
            <div class="sapling-inbox-hero__copy">
              <div class="sapling-inbox-hero__eyebrow">{{ $t('navigation.inbox') }}</div>
              <div class="sapling-inbox-hero__title-row">
                <h2 class="sapling-inbox-hero__title">{{ $t('navigation.inbox') }}</h2>
                <v-chip color="primary" variant="tonal" size="small">
                  {{ totalEntries }}
                </v-chip>
              </div>
              <p class="sapling-inbox-hero__subtitle">
                {{ hasInboxItems
                  ? $t('inbox.heroSummary', { ticketCount: ticketEntries.length, eventCount: taskEntries.length })
                  : $t('inbox.allCaughtUp') }}
              </p>
            </div>

            <div class="sapling-inbox-hero__stats">
              <div class="sapling-inbox-hero__stat">
                <span class="sapling-inbox-hero__stat-label">{{ $t('navigation.ticket') }}</span>
                <strong class="sapling-inbox-hero__stat-value">{{ ticketEntries.length }}</strong>
              </div>
              <div class="sapling-inbox-hero__stat">
                <span class="sapling-inbox-hero__stat-label">{{ $t('navigation.event') }}</span>
                <strong class="sapling-inbox-hero__stat-value">{{ taskEntries.length }}</strong>
              </div>
            </div>
          </section>

          <section class="sapling-inbox-summary-grid">
            <article v-for="card in summaryCards" :key="card.key" class="sapling-inbox-summary-card">
              <div class="sapling-inbox-summary-card__icon" :class="`sapling-inbox-summary-card__icon--${card.tone}`">
                <v-icon :icon="card.icon" />
              </div>
              <div class="sapling-inbox-summary-card__content">
                <div class="sapling-inbox-summary-card__label">{{ $t(card.labelKey) }}</div>
                <div class="sapling-inbox-summary-card__count">{{ card.count }}</div>
              </div>
            </article>
          </section>

          <section v-if="!hasInboxItems" class="sapling-inbox-empty-state glass-panel">
            <div class="sapling-inbox-empty-state__icon">
              <v-icon icon="mdi-check-circle-outline" size="42" />
            </div>
            <h3 class="sapling-inbox-empty-state__title">{{ $t('inbox.allCaughtUpTitle') }}</h3>
            <p class="sapling-inbox-empty-state__copy">{{ $t('inbox.allCaughtUp') }}</p>
          </section>

          <section v-else class="sapling-inbox-sections">
            <article
              v-for="section in sections"
              :key="section.key"
              class="glass-panel tilt-content sapling-inbox-section"
              v-tilt="TILT_DEFAULT_OPTIONS"
            >
              <div class="sapling-inbox-section__header">
                <div class="sapling-inbox-section__title-wrap">
                  <div class="sapling-inbox-section__title-row">
                    <v-icon :icon="section.icon" size="18" />
                    <h3 class="sapling-inbox-section__title">{{ $t(section.titleKey) }}</h3>
                  </div>
                  <p class="sapling-inbox-section__subtitle">{{ $t(section.subtitleKey) }}</p>
                </div>
                <v-chip size="small" color="primary" variant="outlined">{{ section.count }}</v-chip>
              </div>

              <div v-if="section.empty" class="sapling-inbox-section__empty">
                <v-icon :icon="section.icon" size="28" />
                <p>{{ $t(section.emptyKey) }}</p>
              </div>

              <div v-else class="sapling-inbox-section__content">
                <section v-for="group in section.groups" v-show="group.count > 0" :key="group.key" class="sapling-inbox-group">
                  <div class="sapling-inbox-group__header">
                    <div class="sapling-inbox-group__title-row">
                      <v-icon :icon="group.icon" size="18" />
                      <span class="sapling-inbox-group__title">{{ $t(group.labelKey) }}</span>
                    </div>
                    <v-chip size="x-small" variant="tonal">{{ group.count }}</v-chip>
                  </div>

                  <div class="sapling-inbox-entry-list">
                    <article
                      v-for="entry in group.items"
                      :key="entry.id"
                      class="sapling-inbox-entry"
                      tabindex="0"
                      @click="openEntry(entry)"
                      @keyup.enter="openEntry(entry)"
                    >
                      <div class="sapling-inbox-entry__meta-row">
                        <div class="sapling-inbox-entry__kind">
                          <span class="sapling-inbox-entry__kind-indicator" :style="entryAccentStyle(entry.accentColor)"></span>
                          <v-icon :icon="entry.icon" size="16" />
                          <span>{{ $t(group.labelKey) }}</span>
                        </div>
                        <span class="sapling-inbox-entry__date">{{ entry.dateText }}</span>
                      </div>

                      <h4 class="sapling-inbox-entry__title">{{ entry.title }}</h4>
                      <p class="sapling-inbox-entry__description">
                        {{ entry.description || $t('inbox.noDescription') }}
                      </p>

                      <div class="sapling-inbox-entry__footer">
                        <div class="sapling-inbox-entry__chips">
                          <v-chip
                            v-if="entry.contextLabel"
                            size="x-small"
                            variant="tonal"
                            :color="entry.contextColor || 'primary'"
                          >
                            {{ entry.contextLabel }}
                          </v-chip>
                          <v-chip
                            v-if="entry.statusLabel"
                            size="x-small"
                            variant="outlined"
                            :color="entry.statusColor || 'primary'"
                          >
                            {{ entry.statusLabel }}
                          </v-chip>
                        </div>

                        <v-btn
                          icon="mdi-arrow-top-right"
                          variant="tonal"
                          color="primary"
                          size="small"
                          :title="$t('inbox.openEntry')"
                          @click.stop="openEntry(entry)"
                        />
                      </div>
                    </article>
                  </div>
                </section>
              </div>
            </article>
          </section>
        </template>
      </div>

      <SaplingActionClose :close="closeDialog" />
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
//#region Import
import { useSaplingInbox } from '@/composables/account/useSaplingInbox';
import { TILT_DEFAULT_OPTIONS, TILT_SOFT_OPTIONS } from '@/constants/tilt.constants';
import SaplingActionClose from '@/components/actions/SaplingActionClose.vue';
//#endregion

//#region Composable
const emit = defineEmits<{
  (event: 'close'): void;
}>();

const {
  isLoading,
  dialog,
  ticketEntries,
  taskEntries,
  totalEntries,
  hasInboxItems,
  summaryCards,
  sections,
  openEntry,
  closeDialog,
} = useSaplingInbox(emit);

function entryAccentStyle(color?: string | null) {
  return color ? { background: color } : undefined;
}
//#endregion
</script>

<style scoped src="@/assets/styles/SaplingInbox.css"></style>