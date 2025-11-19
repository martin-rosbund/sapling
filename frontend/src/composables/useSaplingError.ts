import { useTranslationLoader } from '@/composables/generic/useTranslationLoader';

export function useSaplingError() {
  // #region State
  // Load translations for the error module
  const { translationService, isLoading, loadTranslations } = useTranslationLoader('error');
  // #endregion

  // #region Return
  // Return all reactive properties and methods for use in components
  return {
    translationService,
    isLoading,
    loadTranslations,
  };
  // #endregion
}
