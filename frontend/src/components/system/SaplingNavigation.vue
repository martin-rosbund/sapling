<template>
  <v-navigation-drawer
    :model-value="drawer"
    temporary
    scrim
    location="left"
    width="430"
    class="sapling-navigation-drawer"
    @update:modelValue="onDrawerUpdate"
  >
    <div class="sapling-drawer-shell sapling-navigation-shell">
      <div class="sapling-drawer-hero sapling-navigation-shell__hero">
        <template v-if="isLoading">
          <div class="sapling-drawer-hero__main sapling-navigation-shell__hero-main">
            <v-skeleton-loader type="heading" width="160" />
          </div>
          <div class="sapling-drawer-hero__summary sapling-navigation-shell__summary">
            <v-skeleton-loader type="text" width="96" />
            <v-skeleton-loader type="text" width="88" />
            <v-skeleton-loader type="text" width="92" />
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
          <div class="sapling-drawer-hero__summary sapling-navigation-shell__summary">
            <template v-if="activePanel === 'navigation'">
              <span>{{ navigationSummary.groupCount }} {{ $t('global.sections') }}</span>
              <span>{{ navigationSummary.subgroupCount }} {{ $t('global.groups') }}</span>
              <span>{{ navigationSummary.entityCount }} {{ $t('global.entities') }}</span>
            </template>
            <template v-else-if="isFavoritesSummaryLoading">
              <v-skeleton-loader type="text" width="96" />
              <v-skeleton-loader type="text" width="88" />
            </template>
            <template v-else>
              <span>{{ favoriteSummary.favoriteCount }} {{ $t('global.items') }}</span>
              <span>{{ favoriteSummary.entityCount }} {{ $t('global.entities') }}</span>
            </template>
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
                <span class="sapling-nav-caption sapling-navigation-section__caption">
                  {{ groupResult.entityCount }} {{ $t('global.items') }} ·
                  {{ groupResult.routeCount }} {{ $t('global.routes') }}
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
                    <v-chip size="x-small" variant="outlined">{{ subgroup.entityCount }}</v-chip>
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
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SaplingFavorites from '@/components/dashboard/SaplingFavorites.vue'
import { useSaplingNavigation } from '@/composables/system/useSaplingNavigation'
import {
  useSaplingFavorites,
  useSaplingFavoritesAccess,
} from '@/composables/dashboard/useSaplingFavorites'
import { getFavoriteEntityHandle } from '@/utils/saplingFavoriteNavigation'
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
  navigationSummary,
  hasSearchResults,
  onDrawerUpdate,
  toggleGroup,
  toggleSubgroup,
  isGroupExpanded,
  isSubgroupExpanded,
  navigateToRoute,
} = useSaplingNavigation(props, emit)

const { hasFavoritesAccess } = useSaplingFavoritesAccess()
const { favorites, isLoading: isFavoritesSummaryLoading } = useSaplingFavorites()
const route = useRoute()
const router = useRouter()
const activePanel = ref<'navigation' | 'favorites'>('navigation')
const isKnowledgeBaseActive = computed(() => route.name === 'knowledgeBase')
const favoriteSummary = computed(() => {
  const entityHandles = new Set(
    favorites.value
      .map((favorite) => getFavoriteEntityHandle(favorite.entity))
      .filter((handle): handle is string => Boolean(handle)),
  )

  return {
    favoriteCount: favorites.value.length,
    entityCount: entityHandles.size,
  }
})

function toggleActivePanel() {
  activePanel.value = activePanel.value === 'navigation' ? 'favorites' : 'navigation'
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
