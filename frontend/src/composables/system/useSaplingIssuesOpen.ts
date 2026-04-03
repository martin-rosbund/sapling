import { computed } from 'vue';
import { useSaplingIssueStatus } from './useSaplingIssue';

/**
 * Compatibility wrapper for callers that render only open issues.
 */
export function useSaplingOpenIssues() {
	const { issues, isLoading, fetchIssues } = useSaplingIssueStatus('open');

	return {
		openIssues: computed(() => issues.value),
		isLoading,
		fetchOpenIssues: fetchIssues,
	};
}
