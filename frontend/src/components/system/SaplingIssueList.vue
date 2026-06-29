<template>
  <v-col cols="12" md="6">
    <section
      class="sapling-stack-xl sapling-work-stream sapling-issue-stream"
      :class="[`sapling-work-stream--${streamTone}`, `sapling-issue-stream--${status}`]"
    >
      <SaplingSurface
        as="header"
        class="sapling-section-header sapling-work-stream__header sapling-issue-stream__header"
      >
        <div class="sapling-work-stream__header-copy sapling-issue-stream__header-copy">
          <div class="sapling-work-stream__eyebrow sapling-issue-stream__eyebrow">
            <v-icon :icon="streamIcon" size="18" />
            <span>{{ $t(statusLabelKey) }}</span>
          </div>
          <h2 class="sapling-section-title sapling-work-stream__title sapling-issue-stream__title">
            {{ $t(titleKey) }}
          </h2>
        </div>

        <v-chip :color="statusChipColor" size="small" variant="tonal">
          <v-skeleton-loader v-if="isLoading" type="text" width="28" />
          <span v-else>{{ issues.length }}</span>
        </v-chip>
      </SaplingSurface>

      <div
        v-if="isLoading"
        class="sapling-stack-xl sapling-work-stream__loading sapling-issue-stream__loading"
      >
        <SaplingSurface
          :as="VSkeletonLoader"
          class="sapling-work-stream__skeleton sapling-issue-stream__skeleton"
          type="article, actions"
        />
        <SaplingSurface
          :as="VSkeletonLoader"
          class="sapling-work-stream__skeleton sapling-issue-stream__skeleton"
          type="article, actions"
        />
      </div>

      <SaplingSurface
        v-else-if="!issues.length"
        class="sapling-empty-state-panel sapling-empty-state-panel--large sapling-work-stream__empty sapling-issue-stream__empty"
      >
        <v-icon :icon="streamIcon" size="34" />
        <p>{{ $t(emptyStateKey) }}</p>
      </SaplingSurface>

      <div v-else class="sapling-stack-xl sapling-work-stream__list sapling-issue-stream__list">
        <SaplingSurface
          v-for="issue in issues"
          :key="`${cardPrefix}-${issue.id}`"
          :as="VCard"
          class="sapling-work-card sapling-issue-card"
          :elevation="8"
          tilt
          :tilt-options="TILT_SOFT_OPTIONS"
        >
          <div class="sapling-work-card__accent sapling-issue-card__accent" />

          <v-card-text
            class="sapling-stack-xl sapling-work-card__content sapling-issue-card__content"
          >
            <div
              class="sapling-row-between-md sapling-work-card__header-row sapling-issue-card__header-row"
            >
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
              class="sapling-work-card__title sapling-issue-card__title"
            >
              {{ issue.title }}
            </a>

            <div class="sapling-detail-grid">
              <div class="sapling-detail-card">
                <span>{{ $t('issue.createdAt') }}</span>
                <strong>{{ formatDateTime(issue.created_at) }}</strong>
              </div>
              <div class="sapling-detail-card">
                <span>{{ $t('issue.updatedAt') }}</span>
                <strong>{{ formatDateTime(issue.updated_at) }}</strong>
              </div>
            </div>

            <div
              v-if="issue.labels.length"
              class="sapling-chip-row sapling-work-card__labels sapling-issue-card__labels"
            >
              <v-chip
                v-for="label in issue.labels"
                :key="label.name"
                size="small"
                variant="flat"
                class="sapling-work-card__label sapling-issue-card__label"
                :style="resolveLabelStyle(label.color)"
              >
                {{ label.name }}
              </v-chip>
            </div>

            <div
              class="sapling-stack-md sapling-work-card__assignees sapling-issue-card__assignees"
            >
              <div class="sapling-label">{{ $t('issue.assignedTo') }}</div>
              <div
                v-if="issue.assignees.length"
                class="sapling-chip-row sapling-work-card__assignee-list sapling-issue-card__assignee-list"
              >
                <a
                  v-for="assignee in issue.assignees"
                  :key="assignee.login"
                  :href="assignee.html_url"
                  target="_blank"
                  rel="noopener"
                  class="sapling-work-card__assignee sapling-issue-card__assignee"
                >
                  <v-avatar size="32">
                    <img :src="assignee.avatar_url" :alt="assignee.login" />
                  </v-avatar>
                  <span>{{ assignee.login }}</span>
                </a>
              </div>
              <div v-else class="sapling-work-card__empty-copy sapling-issue-card__empty-copy">
                -
              </div>
            </div>

            <div
              class="sapling-stack-md sapling-work-card__description sapling-issue-card__description"
            >
              <div class="sapling-label">{{ $t('issue.description') }}</div>
              <div class="sapling-work-card__markdown sapling-issue-card__markdown">
                <VMarkdown :source="issue.body || $t('issue.noDescription')" />
              </div>
            </div>

            <div
              v-if="issue.comments.length"
              class="sapling-stack-md sapling-work-card__comments sapling-issue-card__comments"
            >
              <div class="sapling-label">{{ $t('issue.comments') }}</div>

              <div class="sapling-stack-md sapling-work-card__comment-list">
                <article
                  v-for="comment in issue.comments"
                  :key="comment.id"
                  class="sapling-work-card__comment sapling-issue-card__comment"
                >
                  <header class="sapling-row-between-md sapling-work-card__comment-header">
                    <a
                      v-if="comment.user.html_url"
                      :href="comment.user.html_url"
                      target="_blank"
                      rel="noopener"
                      class="sapling-work-card__comment-author"
                    >
                      <v-avatar size="28">
                        <img
                          v-if="comment.user.avatar_url"
                          :src="comment.user.avatar_url"
                          :alt="comment.user.login"
                        />
                        <v-icon v-else icon="mdi-account-circle-outline" size="22" />
                      </v-avatar>
                      <span>{{ comment.user.login || $t('issue.commentUnknownAuthor') }}</span>
                    </a>
                    <div v-else class="sapling-work-card__comment-author">
                      <v-avatar size="28">
                        <v-icon icon="mdi-account-circle-outline" size="22" />
                      </v-avatar>
                      <span>{{ comment.user.login || $t('issue.commentUnknownAuthor') }}</span>
                    </div>

                    <div class="sapling-row-xs sapling-work-card__comment-meta">
                      <span>{{ formatDateTime(comment.created_at) }}</span>
                      <v-btn
                        :href="comment.html_url"
                        target="_blank"
                        rel="noopener"
                        icon="mdi-open-in-new"
                        variant="text"
                        size="x-small"
                      />
                    </div>
                  </header>

                  <div class="sapling-work-card__markdown sapling-work-card__comment-markdown">
                    <VMarkdown :source="comment.body || $t('issue.noCommentBody')" />
                  </div>
                </article>
              </div>
            </div>
          </v-card-text>
        </SaplingSurface>
      </div>
    </section>
  </v-col>
</template>

<script lang="ts" setup>
// #region Imports
import { VCard, VSkeletonLoader } from 'vuetify/components'
import { computed } from 'vue'
import type { SaplingIssue, SaplingIssueStatus } from '@/composables/system/useSaplingIssue'
import { TILT_SOFT_OPTIONS } from '@/constants/tilt.constants'
import SaplingSurface from '@/components/common/SaplingSurface.vue'
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
const streamTone = computed(() => (props.status === 'open' ? 'success' : 'slate'))
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
