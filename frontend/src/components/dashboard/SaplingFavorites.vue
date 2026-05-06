<template>
  <section class="sapling-favorites-panel">
    <template v-if="isLoading">
      <div class="sapling-favorites-panel__content">
        <v-skeleton-loader class="mb-3" type="text" width="100%" />
        <v-skeleton-loader
          v-for="item in 4"
          :key="item"
          class="mb-3"
          type="list-item-avatar-two-line"
        />
      </div>

      <div class="sapling-favorites-panel__footer">
        <v-skeleton-loader type="button" width="100%" />
      </div>
    </template>

    <template v-else>
      <v-text-field
        v-model="favoriteSearch"
        class="sapling-favorites-panel__search"
        clearable
        density="comfortable"
        hide-details
        prepend-inner-icon="mdi-magnify"
        :placeholder="$t('global.search')"
      />

      <v-list density="comfortable" class="sapling-favorites-panel__content">
        <template v-if="filteredFavoriteGroups.length > 0">
          <template v-for="group in filteredFavoriteGroups" :key="group.handle">
            <v-list-subheader>{{ group.label }}</v-list-subheader>

            <v-list-item
              v-for="favorite in group.favorites"
              :key="favorite.handle"
              @click="openFavorite(favorite)"
            >
              <div class="d-flex align-center justify-space-between w-100">
                <div class="d-flex align-center min-w-0">
                  <v-icon class="mr-2">{{ group.icon }}</v-icon>
                  <span class="ml-1 text-truncate">{{ favorite.title }}</span>
                </div>
                <v-btn
                  icon="mdi-delete"
                  size="x-small"
                  class="glass-panel"
                  @click.stop="removeFavorite(favorite)"
                />
              </div>
            </v-list-item>
          </template>
        </template>

        <v-list-item
          v-else
          prepend-icon="mdi-bookmark-off-outline"
          :title="$t('navigation.noMatchingEntries')"
          disabled
        />
      </v-list>

      <div class="sapling-favorites-panel__footer">
        <v-btn
          v-if="hasFavoriteTemplateAccess"
          block
          color="primary"
          variant="text"
          prepend-icon="mdi-view-list-outline"
          class="d-flex align-center justify-center"
          @click="openFavoriteTemplateLoadDialog"
        >
          <span>{{ $t('favorite.loadTemplate') }}</span>
        </v-btn>
      </div>

      <SaplingFavoriteTemplateLoadDialog
        :model-value="favoriteTemplateLoadDialog"
        :templates="favoriteTemplates"
        :busy-template-handle="loadingFavoriteTemplateHandle"
        :busy="loadingFavoriteTemplateHandle !== null"
        @update:model-value="updateFavoriteTemplateDialog"
        @select="loadFavoriteFromTemplate"
      />
    </template>
  </section>
</template>

<script setup lang="ts">
// #region Imports
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSaplingFavorites } from '@/composables/dashboard/useSaplingFavorites'
import SaplingFavoriteTemplateLoadDialog from '@/components/dashboard/SaplingFavoriteTemplateLoadDialog.vue'
import type { FavoriteItem } from '@/entity/entity'
import { getFavoriteEntityHandle } from '@/utils/saplingFavoriteNavigation'
// #endregion

// #region Emits
const emit = defineEmits<{
  (event: 'navigate'): void
}>()
// #endregion

const { t } = useI18n()
const favoriteSearch = ref('')

// #region Composable
const {
  isLoading,
  hasFavoriteTemplateAccess,
  favorites,
  favoriteTemplates,
  favoriteTemplateLoadDialog,
  loadingFavoriteTemplateHandle,
  openFavoriteTemplateLoadDialog,
  loadFavoriteFromTemplate,
  removeFavorite,
  goToFavorite,
} = useSaplingFavorites()

const filteredFavoriteGroups = computed(() => {
  const searchTerm = favoriteSearch.value.trim().toLowerCase()
  const groups = new Map<
    string,
    {
      handle: string
      label: string
      icon: string
      favorites: FavoriteItem[]
    }
  >()

  favorites.value.forEach((favorite) => {
    const entityHandle = getFavoriteEntityHandle(favorite.entity) ?? 'favorite'
    const translationKey = `navigation.${entityHandle}`
    const translatedLabel = t(translationKey)
    const groupLabel = translatedLabel !== translationKey ? translatedLabel : entityHandle
    const entityIcon =
      typeof favorite.entity === 'object' && favorite.entity?.icon
        ? favorite.entity.icon
        : 'mdi-bookmark'

    const matchesSearch =
      searchTerm.length === 0 ||
      favorite.title.toLowerCase().includes(searchTerm) ||
      groupLabel.toLowerCase().includes(searchTerm)

    if (!matchesSearch) {
      return
    }

    const existingGroup = groups.get(entityHandle)
    if (existingGroup) {
      existingGroup.favorites.push(favorite)
      return
    }

    groups.set(entityHandle, {
      handle: entityHandle,
      label: groupLabel,
      icon: entityIcon,
      favorites: [favorite],
    })
  })

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      favorites: [...group.favorites].sort((left, right) => left.title.localeCompare(right.title)),
    }))
    .sort((left, right) => left.label.localeCompare(right.label))
})

function updateFavoriteTemplateDialog(value: boolean) {
  favoriteTemplateLoadDialog.value = value
}

function openFavorite(favorite: FavoriteItem) {
  void goToFavorite(favorite)
  emit('navigate')
}
// #endregion
</script>
