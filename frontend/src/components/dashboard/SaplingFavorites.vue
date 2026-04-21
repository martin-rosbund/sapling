<template>
  <SaplingDrawer
    :model-value="modelValue"
    @update:model-value="(value) => emit('update:modelValue', value)"
  >
    <v-card flat class="sapling-fill-shell">
      <template v-if="isLoading">
        <v-card-title class="text-white d-flex align-center justify-space-between">
          <v-skeleton-loader type="text" width="180" />
        </v-card-title>
        <v-divider />

        <div class="pa-4 sapling-scrollable">
          <v-skeleton-loader
            v-for="item in 4"
            :key="item"
            class="mb-3"
            type="list-item-avatar-two-line"
          />
        </div>

        <v-divider />

        <div class="pa-4">
          <v-skeleton-loader type="button" width="100%" />
        </div>
      </template>

      <template v-else>
        <v-card-title class="text-white d-flex align-center justify-space-between">
          <v-icon left>{{ entity?.icon }}</v-icon> {{ $t('navigation.favorite') }}
        </v-card-title>
        <v-divider />

        <v-list density="comfortable" class="sapling-scrollable">
          <v-list-item
            v-for="favorite in favorites"
            :key="favorite.handle"
            @click="goToFavorite(favorite)"
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

        <v-divider />

        <div class="d-flex align-end w-100">
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
    </v-card>
  </SaplingDrawer>
</template>

<script setup lang="ts">
// #region Imports
import { useSaplingFavorites } from '@/composables/dashboard/useSaplingFavorites'
import SaplingDrawer from '@/components/common/SaplingDrawer.vue'
import SaplingDialogFavorite from '@/components/dialog/SaplingDialogFavorite.vue'
// #endregion

// #region Props & Emits
defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
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
// #endregion
</script>
