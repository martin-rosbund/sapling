// #region Imports
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { i18n } from '@/i18n'
import { BACKEND_URL, GIT_URL } from '@/constants/project.constants'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import { SaplingWindowWatcher } from '@/utils/saplingWindowWatcher'
import { useSaplingPreferences } from './useSaplingPreferences'
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
  openVectorization?: () => void | Promise<void>
}

interface SaplingFooterActionDefinition {
  key: string
  icon: string
  labelKey: string
  handler: () => void | Promise<void>
  isActive?: boolean
}

/**
 * Provides the footer state, responsive behaviour and shared action handlers.
 */
export function useSaplingFooter(options: UseSaplingFooterOptions = {}) {
  //#region State
  const router = useRouter()
  const currentPersonStore = useCurrentPersonStore()
  const {
    currentLanguage,
    languageOptions,
    isLoading,
    isDarkTheme,
    isGlassEnabled,
    isTiltEnabled,
    appearanceActions,
    setLanguage,
    openIssue,
    toggleTheme,
    toggleGlass,
    toggleTilt,
  } = useSaplingPreferences()
  const windowWatcher = new SaplingWindowWatcher()
  const showActionsInline = ref(true)
  const stopWatchingWindowSize = windowWatcher.onChange((size) => {
    showActionsInline.value = size !== 'small'
  })
  const hasAdministratorRole = computed(
    () =>
      currentPersonStore.person?.roles?.some((role) => {
        if (!role || typeof role === 'string') {
          return false
        }

        return role.isAdministrator === true
      }) ?? false,
  )

  const managementActionDefinitions = computed<SaplingFooterActionDefinition[]>(() => [
    ...(hasAdministratorRole.value
      ? [
          {
            key: 'system',
            icon: 'mdi-poll',
            labelKey: 'global.systemMonitor',
            handler: openSystem,
          },
          {
            key: 'vectorization',
            icon: 'mdi-vector-polyline',
            labelKey: 'global.vectorization',
            handler: openVectorizationDialog,
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
  //#endregion

  //#region Computed
  const managementActions = computed<SaplingFooterAction[]>(() =>
    mapFooterActions(managementActionDefinitions.value),
  )

  const externalActions = computed<SaplingFooterAction[]>(() =>
    mapFooterActions(externalActionDefinitions.value),
  )

  const footerActions = computed(() => [...managementActions.value, ...externalActions.value])
  const footerActionCount = computed(
    () => managementActionDefinitions.value.length + externalActionDefinitions.value.length,
  )
  const appearanceActionCount = computed(() => 3)
  //#endregion

  //#region Lifecycle
  onMounted(async () => {
    await currentPersonStore.fetchCurrentPerson()
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
   * Opens the shared message center dialog via the host component callback.
   */
  function openMessageCenter() {
    options.openMessageCenter?.()
  }

  /**
   * Navigates to the system monitor view.
   */
  async function openSystem() {
    await router.push('/system')
  }

  function openVectorizationDialog() {
    return options.openVectorization?.()
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
    openVectorizationDialog,
    openPlayground,
    openSwagger,
    openGit,
  }
  //#endregion
}
