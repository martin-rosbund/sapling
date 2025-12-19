
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
	const issues = ref<SaplingIssue[]>([]);
	const loading = ref(false);
	const error = ref<string | null>(null);

	const fetchIssues = async () => {
		loading.value = true;
		error.value = null;
		try {
			// Endpoint: /api/github/issues?status=open
			const data = await ApiService.findAll<SaplingIssue[]>('github/issues?status=open');
			issues.value = data;
		} catch (err: any) {
			error.value = err?.message || 'Fehler beim Laden der Issues.';
		} finally {
			loading.value = false;
		}
	};

	onMounted(fetchIssues);

	return {
		issues,
		loading,
		error,
		fetchIssues,
	};
}
