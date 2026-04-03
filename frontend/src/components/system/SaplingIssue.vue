<template>
	<v-container class="sapling-scrollable" fluid>
		<v-row>
			<SaplingIssuesOpen :issues="openIssues" :is-loading="isLoading" />
			<SaplingIssuesClosed :issues="closedIssues" :is-loading="isLoading" />
		</v-row>
	</v-container>
</template>

<script lang="ts" setup>
// #region Imports
import { useSaplingIssue } from '@/composables/system/useSaplingIssue';
import SaplingIssuesClosed from './SaplingIssuesClosed.vue';
import SaplingIssuesOpen from './SaplingIssuesOpen.vue';
// #endregion

// #region Composable
const { openIssues, closedIssues, isLoading } = useSaplingIssue();
// #endregion
</script>