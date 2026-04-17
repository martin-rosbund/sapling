<template>
  <v-col cols="12" md="6">
    <section class="sapling-issue-stream" :class="`sapling-issue-stream--${status}`">
      <header class="sapling-issue-stream__header glass-panel">
        <div class="sapling-issue-stream__header-copy">
          <div class="sapling-issue-stream__eyebrow">
            <v-icon :icon="streamIcon" size="18" />
            <span>{{ $t(statusLabelKey) }}</span>
          </div>
          <h2 class="sapling-issue-stream__title">{{ $t(titleKey) }}</h2>
        </div>

        <v-chip :color="statusChipColor" size="small" variant="tonal">
          {{ isLoading ? '...' : issues.length }}
        </v-chip>
      </header>

      <div v-if="isLoading" class="sapling-issue-stream__loading">
        <v-skeleton-loader
          class="sapling-issue-stream__skeleton glass-panel"
          type="article, actions"
        />
        <v-skeleton-loader
          class="sapling-issue-stream__skeleton glass-panel"
          type="article, actions"
        />
      </div>

      <div v-else-if="!issues.length" class="sapling-issue-stream__empty glass-panel">
        <v-icon :icon="streamIcon" size="34" />
        <p>{{ $t(emptyStateKey) }}</p>
      </div>

      <div v-else class="sapling-issue-stream__list">
        <v-card
          v-for="issue in issues"
          :key="`${cardPrefix}-${issue.id}`"
          v-tilt="TILT_SOFT_OPTIONS"
          class="sapling-issue-card glass-panel tilt-content"
          elevation="8"
        >
          <div class="sapling-issue-card__accent" :style="{ background: accentGradient }" />

          <v-card-text class="sapling-issue-card__content">
            <div class="sapling-issue-card__header-row">
              <v-chip :color="statusChipColor" size="small" variant="tonal">
                {{ $t(statusLabelKey) }}
              </v-chip>

              <v-btn
                :href="issue.html_url"
                target="_blank"
                rel="noopener"
                icon="mdi-open-in-new"
                variant="text"
                size="small"
              />
            </div>

            <a
              :href="issue.html_url"
              target="_blank"
              rel="noopener"
              class="sapling-issue-card__title"
            >
              {{ issue.title }}
            </a>

            <div class="sapling-issue-card__meta-grid">
              <div class="sapling-issue-card__meta-item">
                <span>{{ $t('issue.createdAt') }}</span>
                <strong>{{ formatDateTime(issue.created_at) }}</strong>
              </div>
              <div class="sapling-issue-card__meta-item">
                <span>{{ $t('issue.updatedAt') }}</span>
                <strong>{{ formatDateTime(issue.updated_at) }}</strong>
              </div>
              <div class="sapling-issue-card__meta-item">
                <span>{{ $t('issue.labels') }}</span>
                <strong>{{ issue.labels.length }}</strong>
              </div>
              <div class="sapling-issue-card__meta-item">
                <span>{{ $t('issue.assignedTo') }}</span>
                <strong>{{ issue.assignees.length || '-' }}</strong>
              </div>
            </div>

            <div v-if="issue.labels.length" class="sapling-issue-card__labels">
              <v-chip
                v-for="label in issue.labels"
                :key="label.name"
                size="small"
                variant="flat"
                class="sapling-issue-card__label"
                :style="resolveLabelStyle(label.color)"
              >
                {{ label.name }}
              </v-chip>
            </div>

            <div class="sapling-issue-card__assignees">
              <div class="sapling-issue-card__section-label">{{ $t('issue.assignedTo') }}</div>
              <div v-if="issue.assignees.length" class="sapling-issue-card__assignee-list">
                <a
                  v-for="assignee in issue.assignees"
                  :key="assignee.login"
                  :href="assignee.html_url"
                  target="_blank"
                  rel="noopener"
                  class="sapling-issue-card__assignee"
                >
                  <v-avatar size="32">
                    <img :src="assignee.avatar_url" :alt="assignee.login" />
                  </v-avatar>
                  <span>{{ assignee.login }}</span>
                </a>
              </div>
              <div v-else class="sapling-issue-card__empty-copy">-</div>
            </div>

            <div class="sapling-issue-card__description">
              <div class="sapling-issue-card__section-label">{{ $t('issue.description') }}</div>
              <div class="sapling-issue-card__markdown">
                <VMarkdown :source="issue.body || $t('issue.noDescription')" />
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </section>
  </v-col>
</template>

<script lang="ts" setup>
// #region Imports
import { computed } from 'vue'
import type { SaplingIssue, SaplingIssueStatus } from '@/composables/system/useSaplingIssue'
import { TILT_SOFT_OPTIONS } from '@/constants/tilt.constants'
import VMarkdown from 'vue-markdown-render'
// #endregion

// #region Props
interface SaplingIssueListProps {
  issues: SaplingIssue[]
  isLoading: boolean
  titleKey: string
  status: SaplingIssueStatus
  cardPrefix: string
}

const props = defineProps<SaplingIssueListProps>()

const statusLabelKey = computed(() => (props.status === 'open' ? 'issue.open' : 'issue.closed'))
const emptyStateKey = computed(() =>
  props.status === 'open' ? 'issue.noOpenIssues' : 'issue.noClosedIssues',
)
const streamIcon = computed(() =>
  props.status === 'open' ? 'mdi-progress-wrench' : 'mdi-check-all',
)
const statusChipColor = computed(() => (props.status === 'open' ? 'success' : 'secondary'))
const accentGradient = computed(() =>
  props.status === 'open'
    ? 'linear-gradient(180deg, rgba(46, 125, 50, 0.95) 0%, rgba(102, 187, 106, 0.3) 100%)'
    : 'linear-gradient(180deg, rgba(69, 90, 100, 0.95) 0%, rgba(144, 164, 174, 0.28) 100%)',
)
// #endregion

// #region Methods
/**
 * Formats GitHub timestamps for display in the issue cards.
 */
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

/**
 * Builds inline styles for GitHub label chips with readable contrast.
 */
function resolveLabelStyle(value: string) {
  const backgroundColor = `#${value}`
  const red = parseInt(value.slice(0, 2), 16)
  const green = parseInt(value.slice(2, 4), 16)
  const blue = parseInt(value.slice(4, 6), 16)
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000

  return {
    backgroundColor,
    color: luminance > 160 ? '#102a43' : '#f8fafc',
  }
}
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingIssueList.css"></style>
