import { ref, onMounted } from 'vue';
import ApiService from '@/services/api.service';
import { useTranslationLoader } from '../generic/useTranslationLoader';

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

export function useSaplingIssue() {
	const openIssues = ref<SaplingIssue[]>([]);
	const closedIssues = ref<SaplingIssue[]>([]);
	const { isLoading, loadTranslations } = useTranslationLoader('issue');

	const fetchIssues = async () => {
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
	};

	onMounted(async () => {
		await fetchIssues();
		await loadTranslations();
	});
	
	return {
		openIssues,
		closedIssues,
		isLoading,
		fetchIssues,
	};
}
