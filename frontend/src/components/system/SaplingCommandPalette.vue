<template>
  <v-dialog
    v-model="isOpen"
    width="640"
    max-width="640"
    transition="dialog-top-transition"
    scrollable
    content-class="sapling-command-palette__overlay"
    @update:model-value="onDialogToggle"
  >
    <v-card class="sapling-command-palette glass-panel" rounded="lg">
      <div class="sapling-command-palette__search">
        <v-text-field
          ref="searchInputRef"
          v-model="query"
          :placeholder="t('global.commandPalette.placeholder')"
          density="comfortable"
          hide-details
          autofocus
          autocomplete="off"
          flat
          prepend-inner-icon="mdi-magnify"
          @keydown="onSearchKeydown"
        />
      </div>

      <v-divider />

      <div class="sapling-command-palette__results" role="listbox">
        <template v-if="isLoading">
          <div class="sapling-command-palette__loading">
            <v-progress-circular indeterminate size="24" width="2" color="primary" />
          </div>
        </template>

        <template v-else-if="filteredResults.length === 0">
          <div class="sapling-command-palette__empty">
            {{ t('global.commandPalette.empty') }}
          </div>
        </template>

        <template v-else>
          <template v-for="(group, groupIndex) in groupedResults" :key="group.key">
            <div class="sapling-command-palette__group-label">{{ group.label }}</div>
            <button
              v-for="item in group.items"
              :key="item.id"
              type="button"
              class="sapling-command-palette__item"
              :class="{ 'sapling-command-palette__item--active': item.flatIndex === activeIndex }"
              role="option"
              :aria-selected="item.flatIndex === activeIndex"
              @mouseenter="activeIndex = item.flatIndex"
              @click="runItem(item)"
            >
              <v-icon size="20" class="sapling-command-palette__item-icon">
                {{ item.icon }}
              </v-icon>
              <span class="sapling-command-palette__item-label">{{ item.label }}</span>
              <span v-if="item.hint" class="sapling-command-palette__item-hint">
                {{ item.hint }}
              </span>
            </button>
            <v-divider
              v-if="groupIndex < groupedResults.length - 1"
              class="sapling-command-palette__group-divider"
            />
          </template>
        </template>
      </div>

      <v-divider />

      <div class="sapling-command-palette__footer">
        <span class="sapling-command-palette__shortcut">
          <kbd>↑</kbd><kbd>↓</kbd> {{ t('global.commandPalette.navigate') }}
        </span>
        <span class="sapling-command-palette__shortcut">
          <kbd>↵</kbd> {{ t('global.commandPalette.open') }}
        </span>
        <span class="sapling-command-palette__shortcut">
          <kbd>Esc</kbd> {{ t('global.commandPalette.close') }}
        </span>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ApiGenericService from '@/services/api.generic.service'
import { useCurrentPersonStore } from '@/stores/currentPersonStore'
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore'
import { buildFavoritePath } from '@/utils/saplingFavoriteNavigation'
import { useSaplingPreferences } from '@/composables/system/useSaplingPreferences'
import { useSaplingAccount } from '@/composables/account/useSaplingAccount'
import type {
  EntityItem,
  EntityRouteItem,
  FavoriteItem,
  PersonItem,
} from '@/entity/entity'
import type { AccumulatedPermission } from '@/entity/structure'

type CommandPaletteGroupKey = 'favorite' | 'entity' | 'action'

/**
 * Optional `run` callback lets action items execute side-effects (toggle theme,
 * switch language, logout) instead of navigating. When `run` is provided the
 * stored `path` is ignored.
 */
interface CommandPaletteItem {
  id: string
  group: CommandPaletteGroupKey
  label: string
  hint?: string
  icon: string
  haystack: string
  path: string
  flatIndex: number
  run?: () => void | Promise<void>
}

const router = useRouter()
const { t, te } = useI18n()
const currentPersonStore = useCurrentPersonStore()
const currentPermissionStore = useCurrentPermissionStore()
const { toggleTheme, setLanguage, currentLanguage, isDarkTheme } = useSaplingPreferences()
const { logout } = useSaplingAccount()


const isOpen = ref(false)
const isLoaded = ref(false)
const isLoading = ref(false)
const query = ref('')
const activeIndex = ref(0)
const searchInputRef = ref<{ focus?: () => void } | null>(null)

const entities = ref<EntityItem[]>([])
const favorites = ref<FavoriteItem[]>([])

function onKeyDown(event: KeyboardEvent) {
  // Ctrl+K / Cmd+K opens the palette globally. Ignore key repeats.
  if (event.repeat) {
    return
  }
  const isPaletteShortcut =
    (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k'
  // Slash-shortcut (GitHub / Slack style): only when the user is not currently
  // typing into an input, textarea or contentEditable surface.
  const target = event.target as HTMLElement | null
  const isEditable =
    target?.tagName === 'INPUT' ||
    target?.tagName === 'TEXTAREA' ||
    target?.isContentEditable === true
  const isSlashShortcut =
    event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !isEditable

  if (!isPaletteShortcut && !isSlashShortcut) {
    return
  }
  event.preventDefault()
  void open()
}

async function open() {
  isOpen.value = true
  query.value = ''
  activeIndex.value = 0
  await nextTick()
  searchInputRef.value?.focus?.()
  if (!isLoaded.value) {
    void loadData()
  }
}

function close() {
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
    accumulated.filter((permission) => permission.allowShow).map((p) => p.entityHandle),
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
  return te(key) ? t(key) : entity.handle
}

function getRouteLabel(entity: EntityItem, route: EntityRouteItem) {
  if (route.navigation) {
    const key = `navigation.${route.navigation}`
    return te(key) ? t(key) : route.navigation
  }
  return getEntityLabel(entity)
}

/**
 * Resolves the human-readable entity label for a favorite. Favorites store
 * the entity either as an inlined object (after `relations: ['entity']`) or
 * as a plain handle reference, so we accept both.
 */
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
    return te(key) ? t(key) : entityValue
  }

  return ''
}

const allItems = computed<CommandPaletteItem[]>(() => {
  const items: Omit<CommandPaletteItem, 'flatIndex'>[] = []

  for (const favorite of favorites.value) {
    const path = buildFavoritePath(favorite, entities.value)
    if (!path) {
      continue
    }
    // Favorites carry their user-set label in `title`. Fall back to the
    // backend `name`/`handle` only if title is empty so we never render the
    // generic "Favorit" placeholder for a properly named entry.
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
      hint: favoriteEntityLabel && favoriteEntityLabel !== itemLabel ? favoriteEntityLabel : undefined,
      icon: (typeof favorite.icon === 'string' && favorite.icon) || 'mdi-star',
      haystack: `${itemLabel} ${favoriteEntityLabel}`.toLowerCase(),
      path,
    })
  }

  for (const entity of entities.value) {
    const entityLabel = getEntityLabel(entity)
    const routes = (entity.routes ?? []).filter((r) => Boolean(r.route))
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

  // Static action commands (theme, language, logout) live at the bottom and
  // execute side-effects via `run` instead of navigating.
  for (const action of actionItems.value) {
    items.push(action)
  }

  return items.map((item, index) => ({ ...item, flatIndex: index }))
})

/**
 * Returns the static action commands available in the palette. The list is
 * recomputed on theme / language changes so labels and icons stay accurate.
 */
const actionItems = computed<Omit<CommandPaletteItem, 'flatIndex'>[]>(() => {
  const themeLabel = isDarkTheme.value
    ? t('global.themeLight')
    : t('global.themeDark')
  const themeHint = t('global.commandPalette.actionThemeHint')
  const targetLanguage: 'de' | 'en' = currentLanguage.value === 'de' ? 'en' : 'de'
  const languageLabel =
    targetLanguage === 'de'
      ? t('global.commandPalette.actionLanguageDe')
      : t('global.commandPalette.actionLanguageEn')
  const languageHint = t('global.commandPalette.actionLanguageHint')
  const logoutLabel = t('login.logout')
  const logoutHint = t('global.commandPalette.actionLogoutHint')

  return [
    {
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
    },
    {
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
    },
    {
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
    },
  ]
})

const filteredResults = computed<CommandPaletteItem[]>(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle) {
    return allItems.value.slice(0, 50)
  }
  return allItems.value.filter((item) => item.haystack.includes(needle)).slice(0, 50)
})

interface CommandPaletteGroup {
  key: CommandPaletteGroupKey
  label: string
  items: CommandPaletteItem[]
}

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
  close()
  if (item.run) {
    await item.run()
    return
  }
  await router.push(item.path)
}

async function activateCurrent() {
  const flat = filteredResults.value
  const target = flat[activeIndex.value] ?? flat[0]
  if (target) {
    const original = allItems.value.find((entry) => entry.id === target.id)
    if (original) {
      await runItem(original)
    }
  }
}

function onSearchKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveActive(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveActive(-1)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    void activateCurrent()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<style scoped>
.sapling-command-palette {
  display: flex;
  flex-direction: column;
  width: 640px;
  max-width: 100%;
  /* Shrink to content so a small list does not leave a large empty area,
     but cap the height so long lists stay scrollable. */
  max-height: min(560px, 80vh);
  overflow: hidden;
}

.sapling-command-palette__search {
  padding: 8px 8px 0;
}

.sapling-command-palette__results {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 4px 0;
  min-height: 0;
}

.sapling-command-palette__group-label {
  padding: 10px 16px 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.65;
}

.sapling-command-palette__group-divider {
  margin: 6px 0;
  opacity: 0.4;
}

.sapling-command-palette__item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 16px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  color: inherit;
  font-size: 14px;
}

.sapling-command-palette__item:hover,
.sapling-command-palette__item--active {
  background: rgba(var(--v-theme-primary), 0.12);
}

.sapling-command-palette__item-icon {
  flex: 0 0 auto;
  opacity: 0.85;
}

.sapling-command-palette__item-label {
  flex: 1 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sapling-command-palette__item-hint {
  flex: 0 0 auto;
  font-size: 12px;
  opacity: 0.6;
}

.sapling-command-palette__loading,
.sapling-command-palette__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  opacity: 0.7;
}

.sapling-command-palette__footer {
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  font-size: 11px;
  opacity: 0.6;
}

.sapling-command-palette__shortcut kbd {
  display: inline-block;
  padding: 1px 6px;
  margin-right: 4px;
  border: 1px solid currentColor;
  border-radius: 4px;
  font-size: 10px;
  line-height: 14px;
  font-family: inherit;
}
</style>

<!--
  The Vuetify overlay content lives outside the scoped component tree, so its
  positioning rule must be unscoped. We anchor the palette near the top of the
  viewport instead of centering it: when the list shrinks the bottom edge
  collapses upward and the top edge stays fixed.
-->
<style>
.sapling-command-palette__overlay {
  align-self: flex-start;
  margin-top: 12vh;
}
</style>
