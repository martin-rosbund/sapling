<template>
  <v-container
    class="sapling-page-shell sapling-page-shell--panel sapling-page-shell--scroll sapling-issue-dashboard"
    fluid
  >
    <template v-if="isTranslationLoading">
      <div class="sapling-issue-skeleton">
        <v-skeleton-loader class="glass-panel" type="article" />
        <div class="sapling-issue-skeleton__metrics">
          <v-skeleton-loader v-for="item in 4" :key="item" class="glass-panel" type="article" />
        </div>
        <div class="sapling-issue-skeleton__streams">
          <v-skeleton-loader class="glass-panel" type="article, actions" />
          <v-skeleton-loader class="glass-panel" type="article, actions" />
        </div>
      </div>
    </template>

    <template v-else>
      <SaplingPageHero
        class="sapling-issue-hero"
        variant="signal"
        eyebrow="GitHub"
        :title="$t('issue.heroTitle')"
        :subtitle="$t('issue.heroSubtitle')"
      >
        <template #side>
          <div class="sapling-issue-hero__pulse">
            <div class="sapling-issue-hero__pulse-label">{{ $t('issue.updatedAt') }}</div>
            <div class="sapling-issue-hero__pulse-value">{{ lastUpdatedDisplay }}</div>
          </div>
        </template>
      </SaplingPageHero>

      <section class="sapling-issue-metrics">
        <article class="sapling-issue-metric glass-panel">
          <div class="sapling-issue-metric__icon sapling-issue-metric__icon--open">
            <v-icon icon="mdi-source-branch" />
          </div>
          <div>
            <p class="sapling-issue-metric__label">{{ $t('issue.openIssues') }}</p>
            <strong class="sapling-issue-metric__value">{{
              isLoading ? '...' : openIssues.length
            }}</strong>
          </div>
        </article>

        <article class="sapling-issue-metric glass-panel">
          <div class="sapling-issue-metric__icon sapling-issue-metric__icon--closed">
            <v-icon icon="mdi-check-decagram-outline" />
          </div>
          <div>
            <p class="sapling-issue-metric__label">{{ $t('issue.closedIssues') }}</p>
            <strong class="sapling-issue-metric__value">{{
              isLoading ? '...' : closedIssues.length
            }}</strong>
          </div>
        </article>

        <article class="sapling-issue-metric glass-panel">
          <div class="sapling-issue-metric__icon sapling-issue-metric__icon--label">
            <v-icon icon="mdi-tag-multiple-outline" />
          </div>
          <div>
            <p class="sapling-issue-metric__label">{{ $t('issue.labels') }}</p>
            <strong class="sapling-issue-metric__value">{{
              isLoading ? '...' : labelCount
            }}</strong>
          </div>
        </article>

        <article class="sapling-issue-metric glass-panel">
          <div class="sapling-issue-metric__icon sapling-issue-metric__icon--assignee">
            <v-icon icon="mdi-account-group-outline" />
          </div>
          <div>
            <p class="sapling-issue-metric__label">{{ $t('issue.assignedTo') }}</p>
            <strong class="sapling-issue-metric__value">{{
              isLoading ? '...' : assigneeCount
            }}</strong>
          </div>
        </article>
      </section>

      <v-row class="sapling-issue-streams">
        <SaplingIssuesOpen :issues="openIssues" :is-loading="isLoading" />
        <SaplingIssuesClosed :issues="closedIssues" :is-loading="isLoading" />
      </v-row>
    </template>
  </v-container>
</template>

<script lang="ts" setup>
// #region Imports
import { computed } from 'vue'
import { useSaplingIssue } from '@/composables/system/useSaplingIssue'
import SaplingPageHero from '@/components/common/SaplingPageHero.vue'
import SaplingIssuesClosed from './SaplingIssuesClosed.vue'
import SaplingIssuesOpen from './SaplingIssuesOpen.vue'
// #endregion

// #region Composable
const { openIssues, closedIssues, isTranslationLoading, isLoading } = useSaplingIssue()

const labelCount = computed(() => {
  const names = new Set(
    [...openIssues.value, ...closedIssues.value].flatMap((issue) =>
      issue.labels.map((label) => label.name),
    ),
  )

  return names.size
})

const assigneeCount = computed(() => {
  const logins = new Set(
    [...openIssues.value, ...closedIssues.value].flatMap((issue) =>
      issue.assignees.map((assignee) => assignee.login),
    ),
  )

  return logins.size
})

const lastUpdatedDisplay = computed(() => {
  const timestamps = [...openIssues.value, ...closedIssues.value]
    .map((issue) => new Date(issue.updated_at).getTime())
    .filter((value) => !Number.isNaN(value))

  if (!timestamps.length) {
    return '...'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(Math.max(...timestamps)))
})
// #endregion
</script>
