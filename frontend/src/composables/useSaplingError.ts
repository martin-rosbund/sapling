import { useTranslationLoader } from '@/composables/generic/useTranslationLoader';

export function useSaplingError() {
  const { translationService, isLoading, loadTranslations } = useTranslationLoader('error');
  return {
    translationService,
    isLoading,
    loadTranslations,
  };
}
