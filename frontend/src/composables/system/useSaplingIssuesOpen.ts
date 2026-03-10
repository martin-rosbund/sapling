import { ref, onMounted } from 'vue';
import ApiService from '@/services/api.service';
import { useTranslationLoader } from '../generic/useTranslationLoader';
import type { SaplingIssue } from './useSaplingIssue';

export function useSaplingOpenIssues() {
	const openIssues = ref<SaplingIssue[]>([]);
	const { isLoading, loadTranslations } = useTranslationLoader('issue');

	const fetchOpenIssues = async () => {
		const open = await ApiService.findAll<SaplingIssue[]>(
			'github/issues?status=open'
		);
		openIssues.value = open;
	};

	onMounted(async () => {
		await fetchOpenIssues();
		await loadTranslations();
	});

	return {
		openIssues,
		isLoading,
		fetchOpenIssues,
	};
}
