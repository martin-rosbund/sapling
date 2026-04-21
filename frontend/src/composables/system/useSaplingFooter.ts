// #region Imports
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import CookieService from '@/services/cookie.service'
import { useLocale } from 'vuetify'
import { i18n } from '@/i18n'
import { BACKEND_URL, GIT_URL } from '@/constants/project.constants'
import { SaplingWindowWatcher } from '@/utils/saplingWindowWatcher'
import { useSaplingAppearance } from './useSaplingAppearance'
import { useTranslationLoader } from '../generic/useTranslationLoader'
// #endregion

interface SaplingFooterAction {
  key: string
  icon: string
  label: string
  handler: () => void | Promise<void>
  isActive?: boolean
}

interface UseSaplingFooterOptions {
  openMessageCenter?: () => void
}

type SaplingLanguage = 'de' | 'en'

function normalizeLanguage(value?: string | null): SaplingLanguage {
  return value?.toLowerCase().startsWith('en') ? 'en' : 'de'
}

/**
 * Provides the footer state, responsive behaviour and shared action handlers.
 */
export function useSaplingFooter(options: UseSaplingFooterOptions = {}) {
  //#region State
  const router = useRouter()
  const locale = useLocale()
  const { isLoading } = useTranslationLoader('global')
  const { isDarkTheme, isGlassEnabled, isTiltEnabled, toggleTheme, toggleGlass, toggleTilt } =
    useSaplingAppearance()
  const currentLanguage = ref<SaplingLanguage>(
    normalizeLanguage(CookieService.get('language') || i18n.global.locale.value),
  )
  const windowWatcher = new SaplingWindowWatcher()
  const showActionsInline = ref(true)
  const stopWatchingWindowSize = windowWatcher.onChange((size) => {
    showActionsInline.value = size !== 'small'
  })
  //#endregion

  //#region Computed
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

  const managementActions = computed<SaplingFooterAction[]>(() => {
    currentLanguage.value

    return [
      {
        key: 'issue',
        icon: 'mdi-bug',
        label: i18n.global.t('global.bug'),
        handler: openIssue,
      },
      {
        key: 'system',
        icon: 'mdi-poll',
        label: i18n.global.t('global.systemMonitor'),
        handler: openSystem,
      },
      {
        key: 'playground',
        icon: 'mdi-code-block-braces',
        label: i18n.global.t('global.componentLibrary'),
        handler: openPlayground,
      },
    ]
  })

  const externalActions = computed<SaplingFooterAction[]>(() => {
    currentLanguage.value

    return [
      {
        key: 'swagger',
        icon: 'mdi-api',
        label: i18n.global.t('global.swagger'),
        handler: openSwagger,
      },
      {
        key: 'git',
        icon: 'mdi-git',
        label: i18n.global.t('global.git'),
        handler: openGit,
      },
    ]
  })

  const footerActions = computed(() => [...managementActions.value, ...externalActions.value])

  const appearanceActions = computed<SaplingFooterAction[]>(() => {
    const isGerman = currentLanguage.value === 'de'

    return [
      {
        key: 'theme',
        icon: isDarkTheme.value ? 'mdi-white-balance-sunny' : 'mdi-weather-night',
        label: isGerman
          ? isDarkTheme.value
            ? 'Helles Thema'
            : 'Dunkles Thema'
          : isDarkTheme.value
            ? 'Light Theme'
            : 'Dark Theme',
        handler: toggleTheme,
      },
      {
        key: 'glass',
        icon: isGlassEnabled.value ? 'mdi-blur' : 'mdi-blur-off',
        label: isGerman
          ? isGlassEnabled.value
            ? 'Glasdesign deaktivieren'
            : 'Glasdesign aktivieren'
          : isGlassEnabled.value
            ? 'Disable Glass Design'
            : 'Enable Glass Design',
        handler: toggleGlass,
        isActive: isGlassEnabled.value,
      },
      {
        key: 'tilt',
        icon: 'mdi-image-filter-tilt-shift',
        label: isGerman
          ? isTiltEnabled.value
            ? 'Tilt-Effekt deaktivieren'
            : 'Tilt-Effekt aktivieren'
          : isTiltEnabled.value
            ? 'Disable Tilt Effect'
            : 'Enable Tilt Effect',
        handler: toggleTilt,
        isActive: isTiltEnabled.value,
      },
    ]
  })
  //#endregion

  //#region Lifecycle
  onMounted(async () => {
    applyLanguage(currentLanguage.value)
  })

  /**
   * Tears down the window watcher when the footer unmounts.
   */
  onUnmounted(() => {
    stopWatchingWindowSize()
    windowWatcher.destroy()
  })
  //#endregion

  //#region Methods
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
   * Opens the shared message center dialog via the host component callback.
   */
  function openMessageCenter() {
    options.openMessageCenter?.()
  }

  /**
   * Navigates to the issue management view.
   */
  async function openIssue() {
    await router.push('/issue')
  }

  /**
   * Navigates to the system monitor view.
   */
  async function openSystem() {
    await router.push('/system')
  }

  /**
   * Navigates to the playground view.
   */
  async function openPlayground() {
    await router.push('/playground')
  }

  /**
   * Opens the backend Swagger UI in a separate browser tab.
   */
  function openSwagger() {
    window.open(`${BACKEND_URL}swagger`, '_blank')
  }

  /**
   * Opens the project repository in a separate browser tab.
   */
  function openGit() {
    window.open(GIT_URL, '_blank')
  }
  //#endregion

  //#region Return
  return {
    currentLanguage,
    languageOptions,
    showActionsInline,
    isLoading,
    isDarkTheme,
    isGlassEnabled,
    isTiltEnabled,
    managementActions,
    externalActions,
    footerActions,
    appearanceActions,
    toggleTheme,
    toggleGlass,
    toggleTilt,
    setLanguage,
    openMessageCenter,
    openIssue,
    openSystem,
    openPlayground,
    openSwagger,
    openGit,
  }
  //#endregion
}
