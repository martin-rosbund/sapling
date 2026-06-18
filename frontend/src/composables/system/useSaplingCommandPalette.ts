import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ApiGenericService from '@/services/api.generic.service'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore'
import { buildFavoritePath } from '@/utils/saplingFavoriteNavigation'
import { useSaplingPreferences } from '@/composables/system/useSaplingPreferences'
import { useSaplingAccount } from '@/composables/account/useSaplingAccount'
import { useSaplingAiChat } from '@/composables/system/useSaplingAiChat'
import { useSaplingHelp } from '@/composables/system/useSaplingHelp'
import { pushAppRoute } from '@/utils/routerNavigation'
import type { EntityItem, EntityRouteItem, FavoriteItem, PersonItem } from '@/entity/entity'
import type { AccumulatedPermission } from '@/entity/structure'
import { canAccessEntityWorkspace } from '@/utils/entityAccess'
import type {
  CommandPaletteGroup,
  CommandPaletteGroupKey,
  CommandPaletteItem,
} from '@/components/system/command-palette/commandPalette.types'

export function useSaplingCommandPalette() {
  const router = useRouter()
  const { t, te } = useI18n()
  const currentPersonStore = useCurrentPersonStore()
  const currentPermissionStore = useCurrentPermissionStore()
  const {
    toggleTheme,
    setLanguage,
    currentLanguage,
    isDarkTheme,
    isGlassEnabled,
    isTiltEnabled,
    toggleGlass,
    toggleTilt,
    openIssue,
  } = useSaplingPreferences()
  const { logout } = useSaplingAccount()
  const { hasSaplingAiChatAccess, openSaplingAiChat } = useSaplingAiChat()
  const { openSaplingHelp } = useSaplingHelp()

  const isOpen = ref(false)
  const isLoaded = ref(false)
  const isLoading = ref(false)
  const query = ref('')
  const activeIndex = ref(0)

  const entities = ref<EntityItem[]>([])
  const favorites = ref<FavoriteItem[]>([])

  async function openPalette() {
    isOpen.value = true
    query.value = ''
    activeIndex.value = 0
    if (!isLoaded.value) {
      void loadData()
    }
  }

  function closePalette() {
    isOpen.value = false
  }

  function onDialogToggle(value: boolean) {
    if (!value) {
      query.value = ''
      activeIndex.value = 0
    }
  }

  async function loadData() {
    if (isLoaded.value || isLoading.value) {
      return
    }
    isLoading.value = true
    try {
      await currentPermissionStore.fetchCurrentPermission()
      const accumulated = currentPermissionStore.accumulatedPermission ?? []
      await loadEntities(accumulated)
      await loadFavorites(accumulated)
      isLoaded.value = true
    } catch {
      // Soft-fail: palette stays empty, user can retry by reopening.
    } finally {
      isLoading.value = false
    }
  }

  async function loadEntities(accumulated: AccumulatedPermission[]) {
    const response = await ApiGenericService.find<EntityItem>('entity', {
      filter: { canShow: true },
      relations: ['routes'],
    })
    const allowedHandles = new Set(
      accumulated
        .filter((permission) => canAccessEntityWorkspace(permission))
        .map((permission) => permission.entityHandle),
    )
    entities.value = (response.data ?? []).filter((entity) => allowedHandles.has(entity.handle))
  }

  async function loadFavorites(accumulated: AccumulatedPermission[]) {
    const canReadFavorites = accumulated.some(
      (permission) => permission.entityHandle === 'favorite' && permission.allowRead,
    )
    if (!canReadFavorites) {
      favorites.value = []
      return
    }
    const person: PersonItem | null = currentPersonStore.person
    if (!person?.handle) {
      return
    }
    const response = await ApiGenericService.find<FavoriteItem>('favorite', {
      filter: { person: { handle: person.handle } },
      relations: ['entity', 'entityRoute'],
    })
    favorites.value = response.data ?? []
  }

  function getEntityLabel(entity: EntityItem) {
    const key = `navigation.${entity.handle}`
    return te(key) ? t(key) : ''
  }

  function getRouteLabel(entity: EntityItem, route: EntityRouteItem) {
    if (route.navigation) {
      const key = `navigation.${route.navigation}`
      const routeLabel = te(key) ? t(key) : ''
      if (routeLabel) {
        return routeLabel
      }
    }
    return getEntityLabel(entity)
  }

  function getFavoriteEntityLabel(favorite: FavoriteItem): string {
    const entityValue = favorite.entity
    if (entityValue && typeof entityValue === 'object' && 'handle' in entityValue) {
      return getEntityLabel(entityValue as EntityItem)
    }

    if (typeof entityValue === 'string' && entityValue) {
      const match = entities.value.find((entity) => entity.handle === entityValue)
      if (match) {
        return getEntityLabel(match)
      }
      const key = `navigation.${entityValue}`
      return te(key) ? t(key) : ''
    }

    return ''
  }

  const actionItems = computed<Omit<CommandPaletteItem, 'flatIndex'>[]>(() => {
    const themeLabel = isDarkTheme.value ? t('global.themeLight') : t('global.themeDark')
    const themeHint = t('global.commandPalette.actionThemeHint')
    const targetLanguage: 'de' | 'en' = currentLanguage.value === 'de' ? 'en' : 'de'
    const languageLabel =
      targetLanguage === 'de'
        ? t('global.commandPalette.actionLanguageDe')
        : t('global.commandPalette.actionLanguageEn')
    const languageHint = t('global.commandPalette.actionLanguageHint')
    const logoutLabel = t('login.logout')
    const logoutHint = t('global.commandPalette.actionLogoutHint')

    const items: Omit<CommandPaletteItem, 'flatIndex'>[] = []

    if (hasSaplingAiChatAccess.value) {
      const aiChatLabel = t('global.commandPalette.actionAiChat')
      const aiChatHint = t('global.commandPalette.actionAiChatHint')
      items.push({
        id: 'action:ai-chat',
        group: 'action',
        label: aiChatLabel,
        hint: aiChatHint,
        icon: 'mdi-robot-outline',
        haystack: `${aiChatLabel} ${aiChatHint} ai chat assistent`.toLowerCase(),
        path: '',
        run: async () => {
          await openSaplingAiChat()
        },
      })
    }

    const issueLabel = t('global.commandPalette.actionIssue')
    const issueHint = t('global.commandPalette.actionIssueHint')
    items.push({
      id: 'action:issue',
      group: 'action',
      label: issueLabel,
      hint: issueHint,
      icon: 'mdi-bug-outline',
      haystack: `${issueLabel} ${issueHint} issue bug feedback fehler melden report`.toLowerCase(),
      path: '',
      run: async () => {
        await openIssue()
      },
    })

    const helpLabel = t('global.commandPalette.actionHelp')
    const helpHint = t('global.commandPalette.actionHelpHint')
    items.push({
      id: 'action:help',
      group: 'action',
      label: helpLabel,
      hint: helpHint,
      icon: 'mdi-help-circle-outline',
      haystack: `${helpLabel} ${helpHint} help hilfe shortcuts tastenkurzel f1`.toLowerCase(),
      path: '',
      run: () => {
        openSaplingHelp()
      },
    })

    items.push({
      id: 'action:theme',
      group: 'action',
      label: themeLabel,
      hint: themeHint,
      icon: isDarkTheme.value ? 'mdi-white-balance-sunny' : 'mdi-weather-night',
      haystack: `${themeLabel} ${themeHint} theme design`.toLowerCase(),
      path: '',
      run: () => {
        toggleTheme()
      },
    })

    const glassLabel = isGlassEnabled.value
      ? t('global.disableGlassDesign')
      : t('global.enableGlassDesign')
    const glassHint = t('global.commandPalette.actionGlassHint')
    items.push({
      id: 'action:glass',
      group: 'action',
      label: glassLabel,
      hint: glassHint,
      icon: isGlassEnabled.value ? 'mdi-blur-off' : 'mdi-blur',
      haystack: `${glassLabel} ${glassHint} glass design glas blur`.toLowerCase(),
      path: '',
      run: () => {
        toggleGlass()
      },
    })

    const tiltLabel = isTiltEnabled.value
      ? t('global.disableTiltEffect')
      : t('global.enableTiltEffect')
    const tiltHint = t('global.commandPalette.actionTiltHint')
    items.push({
      id: 'action:tilt',
      group: 'action',
      label: tiltLabel,
      hint: tiltHint,
      icon: 'mdi-image-filter-tilt-shift',
      haystack: `${tiltLabel} ${tiltHint} tilt effect effekt`.toLowerCase(),
      path: '',
      run: () => {
        toggleTilt()
      },
    })

    items.push({
      id: 'action:language',
      group: 'action',
      label: languageLabel,
      hint: languageHint,
      icon: 'mdi-translate',
      haystack: `${languageLabel} ${languageHint} language sprache`.toLowerCase(),
      path: '',
      run: () => {
        setLanguage(targetLanguage)
      },
    })

    items.push({
      id: 'action:logout',
      group: 'action',
      label: logoutLabel,
      hint: logoutHint,
      icon: 'mdi-logout',
      haystack: `${logoutLabel} ${logoutHint} logout abmelden`.toLowerCase(),
      path: '',
      run: async () => {
        await logout()
      },
    })

    return items
  })

  const allItems = computed<CommandPaletteItem[]>(() => {
    const items: Omit<CommandPaletteItem, 'flatIndex'>[] = []

    for (const favorite of favorites.value) {
      const path = buildFavoritePath(favorite, entities.value)
      if (!path) {
        continue
      }
      const itemLabel =
        (typeof favorite.title === 'string' && favorite.title.trim()) ||
        (typeof favorite.name === 'string' && favorite.name.trim()) ||
        (typeof favorite.handle === 'string' || typeof favorite.handle === 'number'
          ? String(favorite.handle)
          : '') ||
        t('global.commandPalette.favorite')
      const favoriteEntityLabel = getFavoriteEntityLabel(favorite)
      items.push({
        id: `favorite:${favorite.handle ?? itemLabel}`,
        group: 'favorite',
        label: itemLabel,
        hint:
          favoriteEntityLabel && favoriteEntityLabel !== itemLabel
            ? favoriteEntityLabel
            : undefined,
        icon: (typeof favorite.icon === 'string' && favorite.icon) || 'mdi-star',
        haystack: `${itemLabel} ${favoriteEntityLabel}`.toLowerCase(),
        path,
      })
    }

    for (const entity of entities.value) {
      const entityLabel = getEntityLabel(entity)
      const routes = (entity.routes ?? []).filter((route) => Boolean(route.route))
      if (routes.length === 0) {
        continue
      }
      for (const route of routes) {
        const label = getRouteLabel(entity, route)
        const sameLabel = label === entityLabel
        items.push({
          id: `entity:${entity.handle}:${route.handle ?? route.route}`,
          group: 'entity',
          label,
          hint: sameLabel ? undefined : entityLabel,
          icon: entity.icon || 'mdi-square-rounded',
          haystack: `${label} ${entityLabel} ${entity.handle}`.toLowerCase(),
          path: `/${(route.route ?? '').replace(/^\/+/, '')}`,
        })
      }
    }

    for (const action of actionItems.value) {
      items.push(action)
    }

    return items.map((item, index) => ({ ...item, flatIndex: index }))
  })

  const filteredResults = computed<CommandPaletteItem[]>(() => {
    const needle = query.value.trim().toLowerCase()
    if (!needle) {
      return allItems.value.slice(0, 50)
    }

    if (needle.endsWith(':') && needle.length > 1) {
      const prefix = needle.slice(0, -1)
      return allItems.value.filter((item) => item.haystack.includes(prefix)).slice(0, 50)
    }

    const colonIdx = needle.indexOf(':')
    if (colonIdx > 1 && colonIdx < needle.length - 1) {
      const entityPart = needle.slice(0, colonIdx)
      const searchPart = needle.slice(colonIdx + 1).trim()
      const matchingEntities = entities.value.filter(
        (entity) =>
          entity.handle.toLowerCase().startsWith(entityPart) ||
          getEntityLabel(entity).toLowerCase().startsWith(entityPart),
      )
      if (matchingEntities.length > 0 && searchPart.length > 0) {
        const searchItems = matchingEntities.map((entity, idx) => {
          const routes = entity.routes ?? []
          let listRoute = routes.find((route) => route.route && route.route.includes('list'))
          if (!listRoute && routes.length > 0) {
            listRoute = routes[0]
          }
          const routePath = listRoute
            ? `/${(listRoute.route ?? '').replace(/^\/+/, '')}`
            : `/${entity.handle}`
          return {
            id: `entitysearch:${entity.handle}:${searchPart}`,
            group: 'entity' as CommandPaletteGroupKey,
            label: `${getEntityLabel(entity)} durchsuchen nach: ${searchPart}`,
            hint: undefined,
            icon: entity.icon || 'mdi-magnify',
            haystack: '',
            path: `${routePath}?search=${encodeURIComponent(searchPart)}`,
            flatIndex: idx,
          } satisfies CommandPaletteItem
        })
        return [
          ...searchItems,
          ...allItems.value
            .filter((item) => item.haystack.includes(entityPart))
            .slice(0, 50 - searchItems.length),
        ]
      }
    }

    return allItems.value.filter((item) => item.haystack.includes(needle)).slice(0, 50)
  })

  const groupedResults = computed<CommandPaletteGroup[]>(() => {
    const reindexed = filteredResults.value.map((item, idx) => ({ ...item, flatIndex: idx }))
    const favoriteGroup = reindexed.filter((item) => item.group === 'favorite')
    const entityGroup = reindexed.filter((item) => item.group === 'entity')
    const actionGroup = reindexed.filter((item) => item.group === 'action')
    const groups: CommandPaletteGroup[] = []
    if (favoriteGroup.length > 0) {
      groups.push({
        key: 'favorite',
        label: t('global.commandPalette.favorites'),
        items: favoriteGroup,
      })
    }
    if (entityGroup.length > 0) {
      groups.push({
        key: 'entity',
        label: t('global.commandPalette.entities'),
        items: entityGroup,
      })
    }
    if (actionGroup.length > 0) {
      groups.push({
        key: 'action',
        label: t('global.commandPalette.actions'),
        items: actionGroup,
      })
    }
    return groups
  })

  watch(filteredResults, () => {
    activeIndex.value = 0
  })

  function moveActive(delta: number) {
    const total = filteredResults.value.length
    if (total === 0) {
      return
    }
    activeIndex.value = (activeIndex.value + delta + total) % total
  }

  async function runItem(item: CommandPaletteItem) {
    closePalette()
    if (item.run) {
      await item.run()
      return
    }
    await pushAppRoute(router, item.path)
  }

  async function activateCurrent() {
    const flat = filteredResults.value
    const target = flat[activeIndex.value] ?? flat[0]
    if (!target) {
      return
    }
    const original = allItems.value.find((entry) => entry.id === target.id)
    if (original) {
      await runItem(original)
      return
    }
    await runItem(target)
  }

  return {
    isOpen,
    isLoading,
    query,
    activeIndex,
    groupedResults,
    openPalette,
    closePalette,
    onDialogToggle,
    moveActive,
    runItem,
    activateCurrent,
  }
}
