<template>
  <section class="sapling-favorites-panel">
      <template v-if="isLoading">
        <div class="sapling-favorites-panel__header">
          <v-skeleton-loader type="text" width="180" />
        </div>

        <div class="sapling-favorites-panel__content">
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
        <div class="sapling-favorites-panel__header">
          <div class="sapling-favorites-panel__headline">
            <v-icon>{{ entity?.icon || 'mdi-bookmark-multiple-outline' }}</v-icon>
            <span>{{ $t('navigation.favorite') }}</span>
          </div>
        </div>

        <v-list density="comfortable" class="sapling-favorites-panel__content">
          <v-list-item
            v-for="favorite in favorites"
            :key="favorite.handle"
            @click="openFavorite(favorite)"
          >
            <div class="d-flex align-center justify-space-between w-100">
              <div class="d-flex align-center">
                <v-icon class="mr-2">{{
                  typeof favorite.entity === 'object' && favorite.entity?.icon
                    ? favorite.entity.icon
                    : 'mdi-bookmark'
                }}</v-icon>
                <span class="ml-1">{{ favorite.title }}</span>
              </div>
              <v-btn
                icon="mdi-delete"
                size="x-small"
                class="glass-panel"
                @click.stop="removeFavorite(favorite)"
              />
            </div>
          </v-list-item>
        </v-list>

        <div class="sapling-favorites-panel__footer">
          <v-btn
            block
            color="primary"
            variant="text"
            prepend-icon="mdi-plus-circle"
            class="d-flex align-center justify-center"
            @click="openAddFavoriteDialog"
          >
            <span>{{ $t('global.add') }}</span>
          </v-btn>
        </div>

        <SaplingDialogFavorite
          :addFavoriteDialog="addFavoriteDialog"
          @update:addFavoriteDialog="updateAddFavoriteDialog"
          :entityOptions="entityOptions"
          :newFavoriteTitle="newFavoriteTitle"
          @update:newFavoriteTitle="updateNewFavoriteTitle"
          :selectedFavoriteEntity="selectedFavoriteEntity"
          @update:selectedFavoriteEntity="updateSelectedFavoriteEntity"
          @addFavorite="addFavorite"
        />
      </template>
  </section>
</template>

<script setup lang="ts">
// #region Imports
import { useSaplingFavorites } from '@/composables/dashboard/useSaplingFavorites'
import SaplingDialogFavorite from '@/components/dialog/SaplingDialogFavorite.vue'
import type { FavoriteItem } from '@/entity/entity'
// #endregion

// #region Emits
const emit = defineEmits<{
  (event: 'navigate'): void
}>()
// #endregion

// #region Composable
const {
  entity,
  isLoading,
  favorites,
  addFavoriteDialog,
  newFavoriteTitle,
  selectedFavoriteEntity,
  entityOptions,
  openAddFavoriteDialog,
  updateAddFavoriteDialog,
  updateNewFavoriteTitle,
  updateSelectedFavoriteEntity,
  removeFavorite,
  goToFavorite,
  addFavorite,
} = useSaplingFavorites()

function openFavorite(favorite: FavoriteItem) {
  goToFavorite(favorite)
  emit('navigate')
}
// #endregion
</script>
