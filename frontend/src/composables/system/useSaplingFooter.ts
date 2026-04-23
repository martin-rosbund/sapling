// #region Imports
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import CookieService from '@/services/cookie.service'
import { useLocale } from 'vuetify'
import { i18n } from '@/i18n'
import { BACKEND_URL, GIT_URL } from '@/constants/project.constants'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
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

interface SaplingFooterActionDefinition {
  key: string
  icon: string
  labelKey: string
  handler: () => void | Promise<void>
  isActive?: boolean
}

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
  const currentPersonStore = useCurrentPersonStore()
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
  const hasAdministratorRole = computed(() =>
    currentPersonStore.person?.roles?.some((role) => {
      if (!role || typeof role === 'string') {
        return false
      }

      return role.isAdministrator === true
    }) ?? false,
  )

  const managementActionDefinitions = computed<SaplingFooterActionDefinition[]>(() => [
    {
      key: 'issue',
      icon: 'mdi-bug',
      labelKey: 'global.bug',
      handler: openIssue,
    },
    ...(hasAdministratorRole.value
      ? [
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
        ]
      : []),
  ])

  const externalActionDefinitions = computed<SaplingFooterActionDefinition[]>(() => {
    if (!hasAdministratorRole.value) {
      return []
    }

    return [
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
    ]
  })

  const appearanceActionDefinitions = computed<SaplingFooterActionDefinition[]>(() => [
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

  const managementActions = computed<SaplingFooterAction[]>(() =>
    mapFooterActions(managementActionDefinitions.value),
  )

  const externalActions = computed<SaplingFooterAction[]>(() =>
    mapFooterActions(externalActionDefinitions.value),
  )

  const footerActions = computed(() => [...managementActions.value, ...externalActions.value])

  const appearanceActions = computed<SaplingFooterAction[]>(() =>
    mapFooterActions(appearanceActionDefinitions.value),
  )
  const footerActionCount = computed(
    () => managementActionDefinitions.value.length + externalActionDefinitions.value.length,
  )
  const appearanceActionCount = computed(() => appearanceActionDefinitions.value.length)
  //#endregion

  //#region Lifecycle
  onMounted(async () => {
    await currentPersonStore.fetchCurrentPerson()
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

  function mapFooterActions(definitions: SaplingFooterActionDefinition[]): SaplingFooterAction[] {
    if (isLoading.value) {
      return []
    }

    return definitions.map(({ labelKey, ...definition }) => ({
      ...definition,
      label: i18n.global.t(labelKey),
    }))
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
    footerActionCount,
    appearanceActionCount,
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
