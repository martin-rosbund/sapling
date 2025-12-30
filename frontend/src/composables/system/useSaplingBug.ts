import { ref, onMounted } from 'vue';
import ApiService from '@/services/api.service';

export interface SaplingIssue {
	id: number;
	title: string;
	html_url: string;
	body: string;
	updated_at: string;
	created_at: string;
	assignees: Array<{
		login: string;
		avatar_url: string;
		html_url: string;
	}>;
	state: string;
	labels: Array<{
		name: string;
		color: string;
	}>;
}

export function useSaplingBug() {
	const openIssues = ref<SaplingIssue[]>([]);
	const closedIssues = ref<SaplingIssue[]>([]);
	const loading = ref(false);
	const error = ref<string | null>(null);

	const fetchIssues = async () => {
		loading.value = true;
		error.value = null;
		try {
			// Fetch open issues
			const open = await ApiService.findAll<SaplingIssue[]>(
				'github/issues?status=open'
			);
			openIssues.value = open;
			// Fetch closed issues
			const closed = await ApiService.findAll<SaplingIssue[]>(
				'github/issues?status=closed'
			);
			closedIssues.value = closed;
		} catch (err: any) {
			error.value = err?.message || 'Fehler beim Laden der Issues.';
		} finally {
			loading.value = false;
		}
	};

	onMounted(fetchIssues);

	return {
		openIssues,
		closedIssues,
		loading,
		error,
		fetchIssues,
	};
}
