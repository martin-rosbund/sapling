<template>
  <!-- Card container for the favorites sideboard -->
  <v-card class="sapling-sideboard-card glass-panel" flat>
    <!-- Title of the favorites sideboard -->
    <v-card-title class="text-white">
      <v-icon left>{{ entity?.icon }}</v-icon> {{ $t('navigation.favorite') }}
    </v-card-title>
    <v-divider></v-divider>

    <!-- Scrollable list of favorites -->
    <div class="sapling-sideboard-list-scroll">
      <v-list dense class="transparent">
        <!-- Iterate over the favorites and display each item -->
        <v-list-item
          v-for="(fav, idx) in favorites"
          :key="fav.handle"
          @click="goToFavorite(fav)">
          <div class="d-flex align-center justify-space-between w-100">
            <div class="d-flex align-center">
              <!-- Display the icon for the favorite item -->
              <v-icon class="mr-2">{{ typeof fav.entity === 'object' && fav.entity?.icon ? fav.entity.icon : DEFAULT_FAVORITE_ICON }}</v-icon>
              <!-- Display the title of the favorite item -->
              <span class="ml-1">{{ fav.title }}</span>
            </div>
            <!-- Button to remove the favorite item -->
            <v-btn icon="mdi-delete" size="x-small" class="glass-panel" @click.stop="removeFavorite(idx)"/>
          </div>
        </v-list-item>
      </v-list>
    </div>
    <v-divider></v-divider>

    <!-- Button to add a new favorite -->
    <div class="d-flex align-end w-100">
      <v-btn block color="primary" variant="text" class="d-flex align-center justify-center" @click="openAddFavoriteDialog">
        <v-icon left>mdi-plus-circle</v-icon>
        <span>{{ $t('global.add') }}</span>
      </v-btn>
    </div>
  </v-card>
</template>

<script setup lang="ts">
//#region Imports
// Import the composable for managing favorites
import { useSaplingFavorites } from '@/composables/useSaplingFavorites';
// Import the type definition for a favorite item
import type { FavoriteItem } from '@/entity/entity';
// Import the CSS file for styling the favorites component
import '../assets/styles/SaplingFavorites.css';
//#endregion

//#region Composable
// Destructure the properties and methods from the useSaplingFavorites composable
const { DEFAULT_FAVORITE_ICON, entity } = useSaplingFavorites();
//#endregion

//#region Props
// Define the props for the component
defineProps<{
  favorites: FavoriteItem[], // List of favorite items
  goToFavorite: (fav: FavoriteItem) => void, // Function to navigate to a favorite item
  removeFavorite: (idx: number) => void, // Function to remove a favorite item
  openAddFavoriteDialog: () => void // Function to open the dialog for adding a new favorite
}>();
//#endregion
</script>
