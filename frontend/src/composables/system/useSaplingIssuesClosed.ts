import { computed } from 'vue'
import { useSaplingIssueStatus } from './useSaplingIssue'

/**
 * Compatibility wrapper for callers that render only closed issues.
 */
export function useSaplingClosedIssues() {
  const { issues, isLoading, fetchIssues } = useSaplingIssueStatus('closed')

  return {
    closedIssues: computed(() => issues.value),
    isLoading,
    fetchClosedIssues: fetchIssues,
  }
}
