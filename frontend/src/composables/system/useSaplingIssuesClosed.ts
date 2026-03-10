import { ref, onMounted } from 'vue';
import ApiService from '@/services/api.service';
import { useTranslationLoader } from '../generic/useTranslationLoader';
import type { SaplingIssue } from './useSaplingIssue';

export function useSaplingClosedIssues() {
	const closedIssues = ref<SaplingIssue[]>([]);
	const { isLoading, loadTranslations } = useTranslationLoader('issue');

	const fetchClosedIssues = async () => {
		const closed = await ApiService.findAll<SaplingIssue[]>(
			'github/issues?status=closed'
		);
		closedIssues.value = closed;
	};

	onMounted(async () => {
		await fetchClosedIssues();
		await loadTranslations();
	});

	return {
		closedIssues,
		isLoading,
		fetchClosedIssues,
	};
}
