<template>
	<v-col cols="12" md="6">
		<template v-if="isLoading">
			<v-skeleton-loader class="mb-4" type="heading" />
			<v-skeleton-loader class="mx-auto fill-height" elevation="12" type="article, actions" />
		</template>
		<div v-else>
			<h3 class="mb-4">{{ $t(titleKey) }}</h3>
			<v-card
				v-for="issue in issues"
				:key="`${cardPrefix}-${issue.id}`"
				class="mb-6 sapling-bug-card glass-panel"
				elevation="3"
			>
				<v-card-title class="d-flex align-center justify-space-between">
					<a
						:href="issue.html_url"
						target="_blank"
						rel="noopener"
						class="text-primary text-truncate d-flex align-center"
						style="max-width: 80%; text-decoration: none !important;"
					>
						<v-icon icon="mdi-link" size="20" class="mr-2" />
						{{ issue.title }}
					</a>
					<v-chip :color="statusColor" size="small">{{ $t(statusLabelKey) }}</v-chip>
				</v-card-title>
				<v-card-subtitle class="mb-2">
					<span v-if="issue.labels.length">
						<span class="font-weight-bold">{{ $t('issue.labels') }}:</span>
						<v-chip
							v-for="label in issue.labels"
							:key="label.name"
							:color="resolveLabelColor(label.color)"
							size="small"
							class="ml-1"
						>
							{{ label.name }}
						</v-chip>
					</span>
				</v-card-subtitle>
				<v-divider />
				<v-card-text>
					<div class="mb-2">
						<span class="font-weight-bold">{{ $t('issue.assignedTo') }}: </span>
						<span v-if="issue.assignees.length">
							<v-avatar v-for="assignee in issue.assignees" :key="assignee.login" size="28" class="ml-2">
								<a :href="assignee.html_url" target="_blank" rel="noopener">
									<img :src="assignee.avatar_url" :alt="assignee.login" style="width: 100%; height: 100%; object-fit: cover;" />
								</a>
							</v-avatar>
							<span v-for="assignee in issue.assignees" :key="`${assignee.login}-name`" class="ml-1">{{ assignee.login }}</span>
						</span>
						<span v-else class="ml-2">-</span>
					</div>
					<div class="mb-2">
						<span class="font-weight-bold">{{ $t('issue.createdAt') }}: </span>
						<span>{{ formatDateTime(issue.created_at) }}</span>
					</div>
					<div class="mb-2">
						<span class="font-weight-bold">{{ $t('issue.updatedAt') }}: </span>
						<span>{{ formatDateTime(issue.updated_at) }}</span>
					</div>
					<div class="mb-2">
						<span class="font-weight-bold">{{ $t('issue.description') }}: </span>
						<div class="mt-1 sapling-bug-description">
							<VMarkdown :source="issue.body || $t('issue.noDescription')" />
						</div>
					</div>
				</v-card-text>
			</v-card>
		</div>
	</v-col>
</template>

<script lang="ts" setup>
// #region Imports
import type { SaplingIssue } from '@/composables/system/useSaplingIssue';
import VMarkdown from 'vue-markdown-render';
// #endregion

// #region Props
interface SaplingIssueListProps {
	issues: SaplingIssue[];
	isLoading: boolean;
	titleKey: string;
	statusLabelKey: string;
	statusColor: string;
	cardPrefix: string;
}

defineProps<SaplingIssueListProps>();
// #endregion

// #region Methods
/**
 * Formats GitHub timestamps for display in the issue cards.
 */
function formatDateTime(value: string) {
	return new Date(value).toLocaleString();
}

/**
 * Converts a GitHub label color into a CSS hex color.
 */
function resolveLabelColor(value: string) {
	return `#${value}`;
}
// #endregion
</script>