import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLocale } from 'vuetify'
import CookieService from '@/services/cookie.service'
import { i18n } from '@/i18n'
import { useSaplingAppearance } from './useSaplingAppearance'
import { useTranslationLoader } from '../generic/useTranslationLoader'

export interface SaplingPreferenceAction {
  key: string
  icon: string
  label: string
  handler: () => void | Promise<void>
  isActive?: boolean
}

interface SaplingPreferenceActionDefinition {
  key: string
  icon: string
  labelKey: string
  handler: () => void | Promise<void>
  isActive?: boolean
}

export type SaplingLanguage = 'de' | 'en'

function normalizeLanguage(value?: string | null): SaplingLanguage {
  return value?.toLowerCase().startsWith('en') ? 'en' : 'de'
}

/**
 * Provides the shared language, appearance and support actions used across shell surfaces.
 */
export function useSaplingPreferences() {
  const router = useRouter()
  const locale = useLocale()
  const { isLoading } = useTranslationLoader('global')
  const { isDarkTheme, isGlassEnabled, isTiltEnabled, toggleTheme, toggleGlass, toggleTilt } =
    useSaplingAppearance()
  const currentLanguage = ref<SaplingLanguage>(
    normalizeLanguage(CookieService.get('language') || i18n.global.locale.value),
  )

  const issueActionDefinition = computed<SaplingPreferenceActionDefinition>(() => ({
    key: 'issue',
    icon: 'mdi-bug',
    labelKey: 'global.bug',
    handler: openIssue,
  }))

  const appearanceActionDefinitions = computed<SaplingPreferenceActionDefinition[]>(() => [
    {
      key: 'theme',
      icon: isDarkTheme.value ? 'mdi-white-balance-sunny' : 'mdi-weather-night',
      labelKey: isDarkTheme.value ? 'global.themeLight' : 'global.themeDark',
      handler: toggleTheme,
    },
    {
      key: 'glass',
      icon: isGlassEnabled.value ? 'mdi-blur' : 'mdi-blur-off',
      labelKey: isGlassEnabled.value ? 'global.disableGlassDesign' : 'global.enableGlassDesign',
      handler: toggleGlass,
      isActive: isGlassEnabled.value,
    },
    {
      key: 'tilt',
      icon: 'mdi-image-filter-tilt-shift',
      labelKey: isTiltEnabled.value ? 'global.disableTiltEffect' : 'global.enableTiltEffect',
      handler: toggleTilt,
      isActive: isTiltEnabled.value,
    },
  ])

  const languageOptions = computed(() => [
    {
      key: 'de' as const,
      label: 'DE',
      isActive: currentLanguage.value === 'de',
    },
    {
      key: 'en' as const,
      label: 'EN',
      isActive: currentLanguage.value === 'en',
    },
  ])

  const issueAction = computed<SaplingPreferenceAction | null>(() => {
    if (isLoading.value) {
      return null
    }

    return mapAction(issueActionDefinition.value)
  })

  const appearanceActions = computed<SaplingPreferenceAction[]>(() => {
    if (isLoading.value) {
      return []
    }

    return appearanceActionDefinitions.value.map(mapAction)
  })

  onMounted(() => {
    applyLanguage(currentLanguage.value)
  })

  /**
   * Applies the selected language to cookies, vue-i18n and Vuetify.
   */
  function applyLanguage(language: SaplingLanguage) {
    currentLanguage.value = language
    CookieService.set('language', language)
    i18n.global.locale.value = language
    locale.current.value = language
  }

  /**
   * Toggles between German and English.
   */
  function setLanguage(language: SaplingLanguage) {
    if (currentLanguage.value === language) {
      return
    }

    applyLanguage(language)
  }

  /**
   * Navigates to the issue management view.
   */
  async function openIssue() {
    await router.push('/issue')
  }

  function mapAction(definition: SaplingPreferenceActionDefinition): SaplingPreferenceAction {
    const { labelKey, ...action } = definition

    return {
      ...action,
      label: i18n.global.t(labelKey),
    }
  }

  return {
    currentLanguage,
    languageOptions,
    isLoading,
    isDarkTheme,
    isGlassEnabled,
    isTiltEnabled,
    issueAction,
    appearanceActions,
    setLanguage,
    openIssue,
    toggleTheme,
    toggleGlass,
    toggleTilt,
  }
}
