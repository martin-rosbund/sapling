<template>
  <v-card class="sapling-sideboard-card" flat>
  <v-card-title class="bg-primary text-white">
      <v-icon left>{{ entity?.icon }}</v-icon> {{ $t('navigation.favorite') }}
    </v-card-title>
    <v-divider></v-divider>
  <div class="sapling-sideboard-list-scroll">
      <v-list dense>
        <v-list-item
          v-for="(fav, idx) in favorites"
          :key="fav.handle"
          @click="goToFavorite(fav)">
          <div class="d-flex align-center justify-space-between w-100">
            <div class="d-flex align-center">
              <v-icon class="mr-2">{{ typeof fav.entity === 'object' && fav.entity?.icon ? fav.entity.icon : DEFAULT_FAVORITE_ICON }}</v-icon>
              <span class="ml-1">{{ fav.title }}</span>
            </div>
            <v-btn icon size="x-small" @click.stop="removeFavorite(idx)">
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </div>
        </v-list-item>
      </v-list>
    </div>
    <v-divider></v-divider>
    <div class="d-flex align-end w-100">
      <v-btn block color="primary" variant="text" class="d-flex align-center justify-center" @click="openAddFavoriteDialog">
        <v-icon left>mdi-plus-circle</v-icon>
        <span>{{ $t('global.add') }}</span>
      </v-btn>
    </div>
  </v-card>
</template>

<script setup lang="ts">
// #region Imports
import { useSaplingFavorites } from '@/composables/useSaplingFavorites';
import type { FavoriteItem } from '@/entity/entity';
import '../assets/styles/SaplingFavorites.css';
// #endregion

// #region Composable
const { DEFAULT_FAVORITE_ICON, entity } = useSaplingFavorites();
// #endregion

// #region Props
// Define component props
defineProps<{
  favorites: FavoriteItem[],
  goToFavorite: (fav: FavoriteItem) => void,
  removeFavorite: (idx: number) => void,
  openAddFavoriteDialog: () => void
}>();
// #endregion
</script>
