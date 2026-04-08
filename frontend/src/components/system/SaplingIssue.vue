<template>
	<v-container class="sapling-scrollable sapling-issue-dashboard pa-1 pa-md-2" fluid>
		<section class="sapling-issue-hero glass-panel">
			<div class="sapling-issue-hero__copy">
				<p class="sapling-issue-hero__eyebrow">GitHub</p>
				<h1 class="sapling-issue-hero__title">{{ $t('issue.heroTitle') }}</h1>
				<p class="sapling-issue-hero__subtitle">
					{{ $t('issue.heroSubtitle') }}
				</p>
			</div>

			<div class="sapling-issue-hero__pulse">
				<div class="sapling-issue-hero__pulse-label">{{ $t('issue.updatedAt') }}</div>
				<div class="sapling-issue-hero__pulse-value">{{ lastUpdatedDisplay }}</div>
			</div>
		</section>

		<section class="sapling-issue-metrics">
			<article class="sapling-issue-metric glass-panel">
				<div class="sapling-issue-metric__icon sapling-issue-metric__icon--open">
					<v-icon icon="mdi-source-branch" />
				</div>
				<div>
					<p class="sapling-issue-metric__label">{{ $t('issue.openIssues') }}</p>
					<strong class="sapling-issue-metric__value">{{ isLoading ? '...' : openIssues.length }}</strong>
				</div>
			</article>

			<article class="sapling-issue-metric glass-panel">
				<div class="sapling-issue-metric__icon sapling-issue-metric__icon--closed">
					<v-icon icon="mdi-check-decagram-outline" />
				</div>
				<div>
					<p class="sapling-issue-metric__label">{{ $t('issue.closedIssues') }}</p>
					<strong class="sapling-issue-metric__value">{{ isLoading ? '...' : closedIssues.length }}</strong>
				</div>
			</article>

			<article class="sapling-issue-metric glass-panel">
				<div class="sapling-issue-metric__icon sapling-issue-metric__icon--label">
					<v-icon icon="mdi-tag-multiple-outline" />
				</div>
				<div>
					<p class="sapling-issue-metric__label">{{ $t('issue.labels') }}</p>
					<strong class="sapling-issue-metric__value">{{ isLoading ? '...' : labelCount }}</strong>
				</div>
			</article>

			<article class="sapling-issue-metric glass-panel">
				<div class="sapling-issue-metric__icon sapling-issue-metric__icon--assignee">
					<v-icon icon="mdi-account-group-outline" />
				</div>
				<div>
					<p class="sapling-issue-metric__label">{{ $t('issue.assignedTo') }}</p>
					<strong class="sapling-issue-metric__value">{{ isLoading ? '...' : assigneeCount }}</strong>
				</div>
			</article>
		</section>

		<v-row class="sapling-issue-streams">
			<SaplingIssuesOpen :issues="openIssues" :is-loading="isLoading" />
			<SaplingIssuesClosed :issues="closedIssues" :is-loading="isLoading" />
		</v-row>
	</v-container>
</template>

<script lang="ts" setup>
// #region Imports
import { computed } from 'vue';
import { useSaplingIssue } from '@/composables/system/useSaplingIssue';
import SaplingIssuesClosed from './SaplingIssuesClosed.vue';
import SaplingIssuesOpen from './SaplingIssuesOpen.vue';
// #endregion

// #region Composable
const { openIssues, closedIssues, isLoading } = useSaplingIssue();

const labelCount = computed(() => {
	const names = new Set(
		[...openIssues.value, ...closedIssues.value].flatMap(issue => issue.labels.map(label => label.name)),
	);

	return names.size;
});

const assigneeCount = computed(() => {
	const logins = new Set(
		[...openIssues.value, ...closedIssues.value].flatMap(issue => issue.assignees.map(assignee => assignee.login)),
	);

	return logins.size;
});

const lastUpdatedDisplay = computed(() => {
	const timestamps = [...openIssues.value, ...closedIssues.value]
		.map(issue => new Date(issue.updated_at).getTime())
		.filter(value => !Number.isNaN(value));

	if (!timestamps.length) {
		return '...';
	}

	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(new Date(Math.max(...timestamps)));
});
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingIssue.css"></style>