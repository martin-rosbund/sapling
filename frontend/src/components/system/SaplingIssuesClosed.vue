<template>
	<SaplingIssueList
		:issues="issues"
		:is-loading="isLoading"
		title-key="issue.closedIssues"
		status-label-key="issue.closed"
		status-color="grey"
		card-prefix="closed"
	/>
</template>

<script lang="ts" setup>
// #region Imports
import type { SaplingIssue } from '@/composables/system/useSaplingIssue';
import SaplingIssueList from './SaplingIssueList.vue';
// #endregion

// #region Props
defineProps<{
	issues: SaplingIssue[];
	isLoading: boolean;
}>();
// #endregion
</script>
