import { computed, onMounted, ref } from 'vue';
import ApiService from '@/services/api.service';
import { useTranslationLoader } from '../generic/useTranslationLoader';

export type SaplingIssueStatus = 'open' | 'closed';

interface SaplingIssueAssignee {
	login: string;
	avatar_url: string;
	html_url: string;
}

interface SaplingIssueLabel {
	name: string;
	color: string;
}

export interface SaplingIssue {
	id: number;
	title: string;
	html_url: string;
	body: string;
	updated_at: string;
	created_at: string;
	assignees: SaplingIssueAssignee[];
	state: string;
	labels: SaplingIssueLabel[];
}

/**
 * Loads and exposes the full issue overview for the system dashboard.
 */
export function useSaplingIssue() {
	//#region State
	const openIssues = ref<SaplingIssue[]>([]);
	const closedIssues = ref<SaplingIssue[]>([]);
	const isIssueLoading = ref(true);
	const { isLoading: isTranslationLoading } = useTranslationLoader('issue');
	const isLoading = computed(() => isTranslationLoading.value || isIssueLoading.value);
	//#endregion

	//#region Lifecycle
	onMounted(async () => {
		await fetchIssues();
	});
	//#endregion

	//#region Methods
	/**
	 * Loads both issue buckets in parallel.
	 */
	const fetchIssues = async () => {
		isIssueLoading.value = true;

		try {
			const [open, closed] = await Promise.all([
				fetchIssuesByStatus('open'),
				fetchIssuesByStatus('closed'),
			]);

			openIssues.value = open;
			closedIssues.value = closed;
		} finally {
			isIssueLoading.value = false;
		}
	};
	//#endregion
	
	//#region Return
	return {
		openIssues,
		closedIssues,
		isTranslationLoading,
		isLoading,
		fetchIssues,
	};
	//#endregion
}

/**
 * Loads one dedicated issue bucket for focused consumers.
 */
export function useSaplingIssueStatus(status: SaplingIssueStatus) {
	//#region State
	const issues = ref<SaplingIssue[]>([]);
	const isIssueLoading = ref(true);
	const { isLoading: isTranslationLoading } = useTranslationLoader('issue');
	const isLoading = computed(() => isTranslationLoading.value || isIssueLoading.value);
	//#endregion

	//#region Lifecycle
	onMounted(async () => {
		await fetchIssues();
	});
	//#endregion

	//#region Methods
	/**
	 * Refreshes the issue list for the requested status.
	 */
	async function fetchIssues() {
		isIssueLoading.value = true;

		try {
			issues.value = await fetchIssuesByStatus(status);
		} finally {
			isIssueLoading.value = false;
		}
	}
	//#endregion

	//#region Return
	return {
		issues,
		isLoading,
		fetchIssues,
	};
	//#endregion
}

/**
 * Fetches all GitHub issues for one status bucket.
 */
async function fetchIssuesByStatus(status: SaplingIssueStatus) {
	return ApiService.findAll<SaplingIssue[]>(`github/issues?status=${status}`);
}
