<template>
  <v-container
    class="sapling-page-shell sapling-page-shell--panel sapling-page-shell--scroll sapling-page-shell--uniform-inset sapling-issue-dashboard"
    fluid
  >
    <template v-if="isTranslationLoading">
      <div class="sapling-stack-xl sapling-issue-skeleton">
        <SaplingSurface :as="VSkeletonLoader" type="article" />
        <div class="sapling-responsive-grid sapling-issue-skeleton__metrics">
          <SaplingSurface
            v-for="item in 4"
            :key="item"
            :as="VSkeletonLoader"
            type="article"
          />
        </div>
        <div class="sapling-two-column-grid sapling-issue-skeleton__streams">
          <SaplingSurface :as="VSkeletonLoader" type="article, actions" />
          <SaplingSurface :as="VSkeletonLoader" type="article, actions" />
        </div>
      </div>
    </template>

    <template v-else>
      <SaplingPageHero
        variant="signal"
        eyebrow="GitHub"
        :title="$t('issue.heroTitle')"
        :subtitle="$t('issue.heroSubtitle')"
      >
        <template #side>
          <div class="sapling-data-card sapling-issue-hero__pulse">
            <div class="sapling-label">{{ $t('issue.updatedAt') }}</div>
            <div class="sapling-issue-hero__pulse-value">{{ lastUpdatedDisplay }}</div>
          </div>
        </template>
      </SaplingPageHero>

      <SaplingSurface as="section" class="sapling-issue-compose">
        <div class="sapling-stack-lg sapling-issue-compose__intro">
          <p class="sapling-eyebrow">{{ $t('issue.createEyebrow') }}</p>
          <h2 class="sapling-issue-compose__title">{{ $t('issue.createTitle') }}</h2>
          <p class="sapling-issue-compose__subtitle">{{ $t('issue.createSubtitle') }}</p>

          <div class="sapling-row-md sapling-issue-compose__hint">
            <v-icon icon="mdi-label-outline" size="18" />
            <span>{{ $t('issue.submitHint') }}</span>
          </div>

          <div v-if="latestCreatedIssue" class="sapling-toolbar-group sapling-issue-compose__latest">
            <v-chip color="success" size="small" variant="tonal">
              #{{ latestCreatedIssue.number }}
            </v-chip>
            <a
              :href="latestCreatedIssue.html_url"
              target="_blank"
              rel="noopener"
              class="sapling-issue-compose__latest-link"
            >
              {{ latestCreatedIssue.title }}
            </a>
          </div>
        </div>

        <v-form class="sapling-stack-lg sapling-issue-compose__form" @submit.prevent="handleCreateIssue">
          <v-text-field
            v-model="draft.title"
            :label="$t('issue.titleFieldLabel')"
            variant="outlined"
            density="comfortable"
            autocomplete="off"
            hide-details="auto"
            maxlength="256"
            counter="256"
          />

          <v-textarea
            v-model="draft.description"
            :label="$t('issue.descriptionFieldLabel')"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            rows="5"
            auto-grow
            maxlength="10000"
            counter="10000"
          />

          <div class="sapling-stack-md sapling-issue-compose__type-field">
            <div class="sapling-label">{{ $t('issue.typeFieldLabel') }}</div>

            <v-btn-toggle
              v-model="draft.type"
              class="sapling-issue-compose__type-toggle"
              color="primary"
              density="comfortable"
              divided
              mandatory
            >
              <v-btn value="bug" prepend-icon="mdi-bug-outline" variant="tonal">
                {{ $t('issue.typeBug') }}
              </v-btn>
              <v-btn value="feature" prepend-icon="mdi-lightbulb-outline" variant="tonal">
                {{ $t('issue.typeFeature') }}
              </v-btn>
            </v-btn-toggle>
          </div>

          <div class="sapling-toolbar-group sapling-issue-compose__actions">
            <v-btn
              type="button"
              variant="text"
              prepend-icon="mdi-restore"
              :disabled="isCreateLoading"
              @click="resetDraft"
            >
              {{ $t('issue.resetAction') }}
            </v-btn>

            <v-spacer />

            <v-btn
              v-if="latestCreatedIssue"
              :href="latestCreatedIssue.html_url"
              target="_blank"
              rel="noopener"
              variant="tonal"
              prepend-icon="mdi-open-in-new"
            >
              {{ $t('issue.openCreatedIssue') }}
            </v-btn>

            <v-btn
              type="submit"
              color="primary"
              prepend-icon="mdi-source-branch-plus"
              :loading="isCreateLoading"
              :disabled="isCreateDisabled"
            >
              {{ $t('issue.createAction') }}
            </v-btn>
          </div>
        </v-form>
      </SaplingSurface>

      <section class="sapling-responsive-grid sapling-issue-metrics">
        <SaplingSurface as="article" class="sapling-metric-card">
          <div class="sapling-icon-tile sapling-issue-metric__icon--open">
            <v-icon icon="mdi-source-branch" />
          </div>
          <div class="sapling-metric-card__copy">
            <p>{{ $t('issue.openIssues') }}</p>
            <strong>{{
              isLoading ? '...' : openIssues.length
            }}</strong>
          </div>
        </SaplingSurface>

        <SaplingSurface as="article" class="sapling-metric-card">
          <div class="sapling-icon-tile sapling-issue-metric__icon--closed">
            <v-icon icon="mdi-check-decagram-outline" />
          </div>
          <div class="sapling-metric-card__copy">
            <p>{{ $t('issue.closedIssues') }}</p>
            <strong>{{
              isLoading ? '...' : closedIssues.length
            }}</strong>
          </div>
        </SaplingSurface>

        <SaplingSurface as="article" class="sapling-metric-card">
          <div class="sapling-icon-tile sapling-issue-metric__icon--label">
            <v-icon icon="mdi-tag-multiple-outline" />
          </div>
          <div class="sapling-metric-card__copy">
            <p>{{ $t('issue.labels') }}</p>
            <strong>{{
              isLoading ? '...' : labelCount
            }}</strong>
          </div>
        </SaplingSurface>

        <SaplingSurface as="article" class="sapling-metric-card">
          <div class="sapling-icon-tile sapling-issue-metric__icon--assignee">
            <v-icon icon="mdi-account-group-outline" />
          </div>
          <div class="sapling-metric-card__copy">
            <p>{{ $t('issue.assignedTo') }}</p>
            <strong>{{
              isLoading ? '...' : assigneeCount
            }}</strong>
          </div>
        </SaplingSurface>
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
import '@/assets/styles/SaplingIssue.css'
import { computed } from 'vue'
import { VSkeletonLoader } from 'vuetify/components'
import { useSaplingIssue } from '@/composables/system/useSaplingIssue'
import SaplingPageHero from '@/components/common/SaplingPageHero.vue'
import SaplingSurface from '@/components/common/SaplingSurface.vue'
import SaplingIssuesClosed from './SaplingIssuesClosed.vue'
import SaplingIssuesOpen from './SaplingIssuesOpen.vue'
// #endregion

// #region Composable
const {
  draft,
  openIssues,
  closedIssues,
  latestCreatedIssue,
  isCreateDisabled,
  isCreateLoading,
  isTranslationLoading,
  isLoading,
  createIssue,
  resetDraft,
} = useSaplingIssue()

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

async function handleCreateIssue() {
  await createIssue()
}
// #endregion
</script>
