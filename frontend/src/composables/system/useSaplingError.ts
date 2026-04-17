import { useTranslationLoader } from '@/composables/generic/useTranslationLoader'

/**
 * Provides the translation-driven loading state for the shared error page.
 */
export function useSaplingError() {
  //#region State
  const { isLoading } = useTranslationLoader('global', 'error')
  //#endregion

  //#region Return
  return {
    isLoading,
  }
  //#endregion
}
