<template>
  <v-navigation-drawer
    :model-value="drawer"
    temporary
    scrim
    location="left"
    :width="navigationDrawerWidth"
    class="sapling-navigation-drawer"
    :class="{ 'sapling-navigation-drawer--wide': isDesktopNavigationPanel }"
    @update:modelValue="onDrawerUpdate"
  >
    <div
      ref="navigationShell"
      class="sapling-drawer-shell sapling-navigation-shell"
      :class="{ 'sapling-navigation-shell--desktop-navigation': isDesktopNavigationPanel }"
    >
      <div class="sapling-drawer-hero sapling-navigation-shell__hero">
        <template v-if="isLoading">
          <div class="sapling-drawer-hero__main sapling-navigation-shell__hero-main">
            <v-skeleton-loader type="heading" width="160" />
          </div>
        </template>
        <template v-else>
          <div class="sapling-drawer-hero__main sapling-navigation-shell__hero-main">
            <div class="sapling-drawer-hero__headline sapling-navigation-shell__headline">
              {{
                activePanel === 'navigation' ? $t('global.navigation') : $t('navigation.favorite')
              }}
            </div>

            <div class="sapling-navigation-shell__hero-actions">
              <v-btn
                class="sapling-navigation-shell__panel-toggle"
                icon="mdi-book-open-page-variant-outline"
                size="small"
                variant="tonal"
                :color="isKnowledgeBaseActive ? 'primary' : undefined"
                :aria-label="$t('navigation.knowledgeBase')"
                @click="navigateToKnowledgeBase"
              />

              <v-btn
                v-if="hasFavoritesAccess"
                class="sapling-navigation-shell__panel-toggle"
                :icon="
                  activePanel === 'navigation'
                    ? 'mdi-bookmark-multiple-outline'
                    : 'mdi-compass-outline'
                "
                size="small"
                variant="tonal"
                :aria-label="
                  activePanel === 'navigation' ? $t('navigation.favorite') : $t('global.navigation')
                "
                @click="toggleActivePanel"
              />
            </div>
          </div>
        </template>
      </div>

      <div
        v-if="activePanel === 'navigation'"
        class="sapling-search-panel sapling-navigation-shell__search-panel"
      >
        <v-text-field
          v-model="navigationSearch"
          class="sapling-navigation-shell__search"
          clearable
          density="comfortable"
          hide-details
          autocomplete="off"
          prepend-inner-icon="mdi-magnify"
          :disabled="isLoading"
          :placeholder="isLoading ? '' : $t('global.search')"
        />
      </div>

      <SaplingFavorites
        v-if="activePanel === 'favorites'"
        class="sapling-panel-scroll sapling-navigation-shell__favorites"
        @navigate="closeNavigation"
      />

      <div v-else-if="isLoading" class="sapling-panel-scroll sapling-navigation-shell__loading">
        <v-skeleton-loader
          v-for="item in 4"
          :key="item"
          class="sapling-navigation-shell__skeleton"
          type="article"
        />
      </div>

      <div
        v-else-if="hasSearchResults && isDesktopNavigationPanel"
        class="sapling-navigation-workspace"
      >
        <nav class="sapling-navigation-primary" :aria-label="$t('global.navigation')">
          <button
            v-for="groupResult in filteredGroups"
            :key="groupResult.group.handle"
            class="sapling-navigation-primary__item"
            :class="{
              'sapling-navigation-primary__item--active':
                selectedNavigationGroup?.group.handle === groupResult.group.handle,
              'sapling-navigation-primary__item--route-active': groupResult.isActive,
            }"
            type="button"
            @click="selectNavigationGroup(groupResult.group.handle)"
          >
            <span class="sapling-navigation-primary__copy">
              <span class="sapling-navigation-primary__icon">
                <v-icon :icon="groupResult.icon"></v-icon>
              </span>
              <span class="sapling-navigation-primary__label">{{ groupResult.label }}</span>
            </span>
            <v-chip size="small" variant="tonal">{{ groupResult.routeCount }}</v-chip>
          </button>
        </nav>

        <section
          v-if="selectedNavigationGroup"
          class="sapling-navigation-detail"
          :aria-label="selectedNavigationGroup.label"
        >
          <div class="sapling-navigation-detail__header">
            <span class="sapling-navigation-detail__title">
              <span class="sapling-nav-icon sapling-navigation-detail__icon">
                <v-icon :icon="selectedNavigationGroup.icon"></v-icon>
              </span>
              <span>{{ selectedNavigationGroup.label }}</span>
            </span>
            <v-chip size="small" variant="tonal">{{ selectedNavigationGroup.routeCount }}</v-chip>
          </div>

          <div class="sapling-navigation-detail__columns">
            <div
              v-for="(column, columnIndex) in selectedNavigationColumns"
              :key="columnIndex"
              class="sapling-navigation-detail__column"
            >
              <section
                v-for="subgroup in column"
                :key="subgroup.group.handle"
                class="sapling-navigation-detail-group"
                :class="{ 'sapling-navigation-detail-group--active': subgroup.isActive }"
              >
                <div class="sapling-navigation-detail-group__header">
                  <span class="sapling-navigation-detail-group__title">
                    <v-icon :icon="subgroup.icon" size="18"></v-icon>
                    <span>{{ subgroup.label }}</span>
                  </span>
                  <v-chip size="x-small" variant="outlined">{{ subgroup.routeCount }}</v-chip>
                </div>

                <div class="sapling-navigation-detail-group__entries">
                  <div
                    v-for="entry in subgroup.entities"
                    :key="entry.entity.handle"
                    class="sapling-navigation-detail-entry"
                    :class="{ 'sapling-navigation-detail-entry--active': entry.isActive }"
                  >
                    <button
                      v-if="entry.routes.length === 1"
                      class="sapling-navigation-detail-entry__single"
                      type="button"
                      @click="navigateToRoute(entry.routes[0].route)"
                    >
                      <span class="sapling-navigation-detail-entry__copy">
                        <span class="sapling-nav-icon sapling-nav-icon--sm">
                          <v-icon :icon="entry.icon"></v-icon>
                        </span>
                        <span class="sapling-navigation-detail-entry__label">{{
                          entry.routes[0].label
                        }}</span>
                      </span>
                      <v-icon icon="mdi-arrow-top-right" size="18"></v-icon>
                    </button>

                    <div v-else class="sapling-navigation-detail-entry__multi">
                      <div class="sapling-navigation-detail-entry__heading">
                        <span class="sapling-navigation-detail-entry__copy">
                          <span class="sapling-nav-icon sapling-nav-icon--sm">
                            <v-icon :icon="entry.icon"></v-icon>
                          </span>
                          <span class="sapling-navigation-detail-entry__label">{{
                            entry.label
                          }}</span>
                        </span>
                        <v-chip size="x-small" variant="outlined">{{ entry.routes.length }}</v-chip>
                      </div>

                      <div class="sapling-navigation-detail-entry__routes">
                        <button
                          v-for="routeEntry in entry.routes"
                          :key="routeEntry.path"
                          class="sapling-navigation-detail-route"
                          :class="{
                            'sapling-navigation-detail-route--active': routeEntry.isActive,
                          }"
                          type="button"
                          @click="navigateToRoute(routeEntry.route)"
                        >
                          <span>{{ routeEntry.label }}</span>
                          <v-icon icon="mdi-chevron-right" size="16"></v-icon>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>

      <div
        v-else-if="hasSearchResults"
        class="sapling-panel-scroll sapling-navigation-shell__content"
      >
        <section
          v-for="groupResult in filteredGroups"
          :key="groupResult.group.handle"
          class="sapling-nav-card sapling-navigation-section"
          :class="{
            'sapling-nav-card--active': groupResult.isActive,
            'sapling-navigation-section--active': groupResult.isActive,
          }"
        >
          <button
            class="sapling-nav-line sapling-nav-trigger sapling-navigation-section__trigger"
            type="button"
            :aria-expanded="isGroupExpanded(groupResult.group.handle)"
            @click="toggleGroup(groupResult.group.handle)"
          >
            <span class="sapling-nav-copy sapling-navigation-section__copy">
              <span class="sapling-nav-icon sapling-navigation-section__icon">
                <v-icon :icon="groupResult.icon"></v-icon>
              </span>
              <span class="sapling-nav-text sapling-navigation-section__text">
                <span class="sapling-nav-title sapling-navigation-section__label">
                  {{ groupResult.label }}
                </span>
              </span>
            </span>
            <span class="sapling-nav-actions sapling-navigation-section__actions">
              <v-chip size="small" variant="tonal">{{ groupResult.routeCount }}</v-chip>
              <v-icon
                :icon="
                  isGroupExpanded(groupResult.group.handle) ? 'mdi-chevron-up' : 'mdi-chevron-down'
                "
              ></v-icon>
            </span>
          </button>

          <v-expand-transition>
            <div
              v-show="isGroupExpanded(groupResult.group.handle)"
              class="sapling-nav-body sapling-navigation-section__body"
            >
              <article
                v-for="subgroup in groupResult.subgroups"
                :key="subgroup.group.handle"
                class="sapling-nav-card sapling-nav-card--muted sapling-navigation-subgroup"
                :class="{
                  'sapling-nav-card--active': subgroup.isActive,
                  'sapling-navigation-subgroup--active': subgroup.isActive,
                }"
              >
                <button
                  class="sapling-nav-line sapling-nav-trigger sapling-navigation-subgroup__trigger"
                  type="button"
                  :aria-expanded="isSubgroupExpanded(subgroup.group.handle)"
                  @click="toggleSubgroup(subgroup.group.handle)"
                >
                  <span class="sapling-nav-copy sapling-navigation-subgroup__copy">
                    <v-icon :icon="subgroup.icon" size="18"></v-icon>
                    <span>{{ subgroup.label }}</span>
                  </span>
                  <span class="sapling-nav-actions sapling-navigation-subgroup__actions">
                    <v-chip size="x-small" variant="outlined">{{ subgroup.routeCount }}</v-chip>
                    <v-icon
                      size="18"
                      :icon="
                        isSubgroupExpanded(subgroup.group.handle)
                          ? 'mdi-chevron-up'
                          : 'mdi-chevron-down'
                      "
                    ></v-icon>
                  </span>
                </button>

                <v-expand-transition>
                  <div
                    v-show="isSubgroupExpanded(subgroup.group.handle)"
                    class="sapling-nav-body sapling-navigation-subgroup__entries"
                  >
                    <article
                      v-for="entry in subgroup.entities"
                      :key="entry.entity.handle"
                      class="sapling-nav-card sapling-navigation-entity"
                      :class="{
                        'sapling-nav-card--active': entry.isActive,
                        'sapling-navigation-entity--active': entry.isActive,
                      }"
                    >
                      <button
                        v-if="entry.routes.length === 1"
                        class="sapling-nav-line sapling-nav-trigger sapling-navigation-entity__single"
                        type="button"
                        @click="navigateToRoute(entry.routes[0].route)"
                      >
                        <span class="sapling-nav-copy sapling-navigation-entity__single-copy">
                          <span
                            class="sapling-nav-icon sapling-nav-icon--sm sapling-navigation-entity__icon"
                          >
                            <v-icon :icon="entry.icon"></v-icon>
                          </span>
                          <span
                            class="sapling-nav-text sapling-nav-text--compact sapling-navigation-entity__text"
                          >
                            <span
                              class="sapling-nav-title sapling-nav-title--truncate sapling-navigation-entity__title"
                              >{{ entry.routes[0].label }}</span
                            >
                          </span>
                        </span>
                        <v-icon icon="mdi-arrow-top-right" size="18"></v-icon>
                      </button>

                      <div v-else class="sapling-navigation-entity__multi">
                        <div class="sapling-nav-line sapling-navigation-entity__header">
                          <span class="sapling-nav-copy sapling-navigation-entity__single-copy">
                            <span
                              class="sapling-nav-icon sapling-nav-icon--sm sapling-navigation-entity__icon"
                            >
                              <v-icon :icon="entry.icon"></v-icon>
                            </span>
                            <span
                              class="sapling-nav-text sapling-nav-text--compact sapling-navigation-entity__text"
                            >
                              <span
                                class="sapling-nav-title sapling-nav-title--truncate sapling-navigation-entity__title"
                                >{{ entry.label }}</span
                              >
                            </span>
                          </span>
                          <v-chip size="x-small" variant="outlined">{{
                            entry.routes.length
                          }}</v-chip>
                        </div>

                        <div class="sapling-navigation-entity__routes">
                          <button
                            v-for="routeEntry in entry.routes"
                            :key="routeEntry.path"
                            class="sapling-nav-route sapling-navigation-route"
                            :class="{
                              'sapling-nav-route--active': routeEntry.isActive,
                              'sapling-navigation-route--active': routeEntry.isActive,
                            }"
                            type="button"
                            @click="navigateToRoute(routeEntry.route)"
                          >
                            <span>{{ routeEntry.label }}</span>
                            <v-icon icon="mdi-chevron-right" size="16"></v-icon>
                          </button>
                        </div>
                      </div>
                    </article>
                  </div>
                </v-expand-transition>
              </article>
            </div>
          </v-expand-transition>
        </section>
      </div>

      <div v-else class="sapling-empty-state-panel sapling-navigation-shell__empty">
        <v-icon icon="mdi-compass-off-outline" size="32"></v-icon>
        <div>{{ $t('navigation.noMatchingEntries') }}</div>
      </div>
    </div>
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
// #region Imports
import { computed, nextTick, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import SaplingFavorites from '@/components/dashboard/SaplingFavorites.vue'
import { useSaplingNavigation } from '@/composables/system/useSaplingNavigation'
import { useSaplingFavoritesAccess } from '@/composables/dashboard/useSaplingFavorites'
// #endregion

// #region Props & Emits
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()
// #endregion

// #region Composable
const {
  isLoading,
  drawer,
  navigationSearch,
  filteredGroups,
  hasSearchResults,
  onDrawerUpdate,
  toggleGroup,
  toggleSubgroup,
  isGroupExpanded,
  isSubgroupExpanded,
  navigateToRoute,
} = useSaplingNavigation(props, emit)

const { hasFavoritesAccess } = useSaplingFavoritesAccess()
const route = useRoute()
const router = useRouter()
const { mdAndUp, width: viewportWidth, xlAndUp } = useDisplay()
const activePanel = ref<'navigation' | 'favorites'>('navigation')
const navigationShell = ref<HTMLElement | null>(null)
const navigationBaseWidth = 430
const navigationPanelMinViewportWidth = 1180
const navigationDesktopPanelWidth = 1220
const navigationWidePanelWidth = 1600
const isKnowledgeBaseActive = computed(() => route.name === 'knowledgeBase')
const isDesktopNavigationPanel = computed(
  () =>
    viewportWidth.value >= navigationPanelMinViewportWidth &&
    activePanel.value === 'navigation' &&
    hasSearchResults.value &&
    !isLoading.value,
)
const navigationDrawerWidth = computed(() => {
  if (!isDesktopNavigationPanel.value) {
    return navigationBaseWidth
  }

  const preferredWidth = xlAndUp.value ? navigationWidePanelWidth : navigationDesktopPanelWidth
  const viewportSafeWidth = Math.max(navigationBaseWidth, viewportWidth.value - 32)

  return Math.min(preferredWidth, viewportSafeWidth)
})
const selectedGroupHandle = ref<string | null>(null)
const selectedNavigationGroup = computed(() => {
  if (filteredGroups.value.length === 0) {
    return null
  }

  const selectedGroup = selectedGroupHandle.value
    ? filteredGroups.value.find((group) => group.group.handle === selectedGroupHandle.value)
    : null

  return (
    selectedGroup ??
    filteredGroups.value.find((group) => group.isActive) ??
    filteredGroups.value[0]
  )
})
const selectedNavigationColumns = computed(() => {
  const subgroups = selectedNavigationGroup.value?.subgroups ?? []
  const columnCount = xlAndUp.value ? 3 : 2
  const columns = Array.from({ length: columnCount }, () => [] as typeof subgroups)

  subgroups.forEach((subgroup, index) => {
    columns[index % columnCount].push(subgroup)
  })

  return columns
})

function toggleActivePanel() {
  activePanel.value = activePanel.value === 'navigation' ? 'favorites' : 'navigation'
}

async function selectNavigationGroup(groupHandle: string) {
  selectedGroupHandle.value = groupHandle

  if (isDesktopNavigationPanel.value) {
    await nextTick()
    const drawerContent =
      navigationShell.value?.closest<HTMLElement>('.v-navigation-drawer__content') ?? null
    const detailColumns =
      navigationShell.value?.querySelector<HTMLElement>('.sapling-navigation-detail__columns') ??
      null
    if (drawerContent) {
      drawerContent.scrollTop = 0
    }
    if (detailColumns) {
      detailColumns.scrollTop = 0
    }
  }
}

function closeNavigation() {
  onDrawerUpdate(false)
}

async function navigateToKnowledgeBase() {
  if (!isKnowledgeBaseActive.value) {
    await router.push({ name: 'knowledgeBase' })
  }

  closeNavigation()
}
// #endregion
</script>
