// #region Imports
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import CookieService from '@/services/cookie.service'
import { useLocale, useTheme } from 'vuetify'
import { i18n } from '@/i18n'
import deFlag from '@/assets/language/de-DE.png'
import enFlag from '@/assets/language/en-US.png'
import { BACKEND_URL, GIT_URL } from '@/constants/project.constants'
import ApiService from '@/services/api.service'
import { SaplingWindowWatcher } from '@/utils/saplingWindowWatcher'
import { useTranslationLoader } from '../generic/useTranslationLoader'
// #endregion

interface SaplingFooterAction {
  key: string
  icon: string
  labelKey: string
  handler: () => void | Promise<void>
}

interface UseSaplingFooterOptions {
  openMessageCenter?: () => void
  loadVersion?: boolean
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
  const theme = useTheme()
  const locale = useLocale()
  const { isLoading } = useTranslationLoader('global')
  const currentLanguage = ref<SaplingLanguage>(
    normalizeLanguage(CookieService.get('language') || i18n.global.locale.value),
  )
  const version = ref('')
  const windowWatcher = new SaplingWindowWatcher()
  const showActionsInline = ref(true)
  const stopWatchingWindowSize = windowWatcher.onChange((size) => {
    showActionsInline.value = size !== 'small'
  })
  //#endregion

  //#region Computed
  const isDarkTheme = computed(() => theme.global.current.value.dark)

  const alternateLanguageFlag = computed(() => (currentLanguage.value === 'de' ? enFlag : deFlag))

  const versionLabel = computed(() => (version.value ? `Version ${version.value}` : ''))

  const managementActions = computed<SaplingFooterAction[]>(() => [
    {
      key: 'issue',
      icon: 'mdi-bug',
      labelKey: 'global.bug',
      handler: openIssue,
    },
    {
      key: 'system',
      icon: 'mdi-poll',
      labelKey: 'global.systemMonitor',
      handler: openSystem,
    },
    {
      key: 'playground',
      icon: 'mdi-code-block-braces',
      labelKey: 'global.componentLibrary',
      handler: openPlayground,
    },
  ])

  const externalActions = computed<SaplingFooterAction[]>(() => [
    {
      key: 'swagger',
      icon: 'mdi-api',
      labelKey: 'global.swagger',
      handler: openSwagger,
    },
    {
      key: 'git',
      icon: 'mdi-git',
      labelKey: 'global.git',
      handler: openGit,
    },
  ])

  const footerActions = computed(() => [...managementActions.value, ...externalActions.value])

  const themeAction = computed<SaplingFooterAction>(() => ({
    key: 'theme',
    icon: isDarkTheme.value ? 'mdi-white-balance-sunny' : 'mdi-weather-night',
    labelKey: isDarkTheme.value ? 'global.themeLight' : 'global.themeDark',
    handler: toggleTheme,
  }))
  //#endregion

  //#region Lifecycle
  /**
   * Loads the version and synchronizes the locale state once the footer mounts.
   */
  onMounted(async () => {
    applyLanguage(currentLanguage.value)

    if (options.loadVersion === false) {
      return
    }

    try {
      const result = await ApiService.findOne<{ version: string }>('system/version')
      version.value = result.version
    } catch {
      version.value = ''
    }
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
   * Toggles between the two supported color themes.
   */
  function toggleTheme() {
    const nextTheme = isDarkTheme.value ? 'light' : 'dark'
    theme.change(nextTheme)
    CookieService.set('theme', nextTheme)
  }

  /**
   * Toggles between German and English.
   */
  function toggleLanguage() {
    applyLanguage(currentLanguage.value === 'de' ? 'en' : 'de')
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
    theme,
    currentLanguage,
    alternateLanguageFlag,
    version,
    versionLabel,
    showActionsInline,
    isLoading,
    isDarkTheme,
    managementActions,
    externalActions,
    footerActions,
    themeAction,
    toggleTheme,
    toggleLanguage,
    openMessageCenter,
    openIssue,
    openSystem,
    openPlayground,
    openSwagger,
    openGit,
  }
  //#endregion
}
