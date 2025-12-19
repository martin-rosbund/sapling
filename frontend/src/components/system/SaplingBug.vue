<template>
	<v-container class="py-8 px-2" fluid>
				<v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
				<v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />
				<div v-if="issues.length" class="sapling-bug-scrollview sapling-bug-list">
					<v-card v-for="issue in issues" :key="issue.id" class="mb-6 sapling-bug-card glass-panel" elevation="3">
							<v-card-title class="d-flex align-center justify-space-between">
								<a :href="issue.html_url" target="_blank" rel="noopener" class="text-primary text-truncate d-flex align-center" style="max-width: 80%; text-decoration: none !important;">
									<v-icon icon="mdi-link" size="20" class="mr-2" />
									{{ issue.title }}
								</a>
								<v-chip :color="issue.state === 'open' ? 'green' : 'grey'" size="small">{{ issue.state }}</v-chip>
							</v-card-title>
							<v-card-subtitle class="mb-2">
								<span v-if="issue.labels.length">
									<span class="font-weight-bold">Labels:</span>
									<v-chip v-for="label in issue.labels" :key="label.name" :color="'#'+label.color" size="small" class="ml-1">{{ label.name }}</v-chip>
								</span>
							</v-card-subtitle>
							<v-divider />
							<v-card-text>
								<div class="mb-2">
									<span class="font-weight-bold">Zugewiesen an:</span>
									<span v-if="issue.assignees.length">
										<v-avatar v-for="assignee in issue.assignees" :key="assignee.login" size="28" class="ml-2">
											<a :href="assignee.html_url" target="_blank" rel="noopener">
												<img :src="assignee.avatar_url" :alt="assignee.login" style="width: 100%; height: 100%; object-fit: cover;" />
											</a>
										</v-avatar>
										<span v-for="assignee in issue.assignees" :key="assignee.login + '-name'" class="ml-1">{{ assignee.login }}</span>
									</span>
									<span v-else class="ml-2">–</span>
								</div>
								<div class="mb-2">
									<span class="font-weight-bold">Erstellt am:</span>
									<span>{{ new Date(issue.created_at).toLocaleString() }}</span>
								</div>
								<div class="mb-2">
									<span class="font-weight-bold">Zuletzt aktualisiert:</span>
									<span>{{ new Date(issue.updated_at).toLocaleString() }}</span>
								</div>
								<div class="mb-2">
									<span class="font-weight-bold">Beschreibung:</span>
									<div class="mt-1 sapling-bug-description">
										<VMarkdown :source="issue.body || 'Keine Beschreibung.'" />
									</div>
								</div>
							</v-card-text>
						</v-card>
				</div>
				<v-alert v-else-if="!loading" type="info">Keine offenen Issues gefunden.</v-alert>
	</v-container>
</template>

<script lang="ts" setup>

import { useSaplingBug } from '@/composables/system/useSaplingBug';
import 'vuetify/styles';
import { VAvatar, VChip, VAlert, VProgressLinear, VContainer } from 'vuetify/components';
import VMarkdown from 'vue-markdown-render'

const { issues, loading, error } = useSaplingBug();
</script>

<style scoped>
.sapling-bug-list {
	background: transparent;
}
.sapling-bug-card {
	border-radius: 16px;
	transition: box-shadow 0.2s;
}
.sapling-bug-card:hover {
	box-shadow: 0 4px 24px 0 rgba(60,60,60,0.10);
}
.sapling-bug-description {
	font-family: inherit;
	font-size: 1rem;
	color: var(--v-theme-on-surface);
}
.sapling-bug-scrollview {
  max-height: 80vh;
  overflow-y: auto;
}
.text-primary {
	color: var(--v-theme-primary) !important;
}
</style>
