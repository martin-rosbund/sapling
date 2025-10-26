<template>
  <v-card class="sideboard-card rounded-0 d-flex flex-column" flat style="height: 100%; max-height: 100%; min-height: 0;">
    <v-card-title class="bg-primary text-white">
      <v-icon left>mdi-star</v-icon> Favoriten
    </v-card-title>
    <v-divider></v-divider>
    <div class="sideboard-list-scroll d-flex flex-column" style="flex: 1 1 0; min-height: 0; max-height: 100%; overflow-y: auto;">
      <v-list dense>
        <v-list-item
          v-for="(fav, idx) in favorites"
          :key="fav.handle"
          @click="goToFavorite(fav)"
          class="favorite-item"
        >
          <div class="d-flex align-center justify-space-between w-100">
            <div class="d-flex align-center">
              <v-icon class="mr-2">{{ fav.entity?.icon || 'mdi-bookmark' }}</v-icon>
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
    <div class="d-flex align-end" style="width: 100%; flex: 0 0 auto;">
      <v-btn block color="primary" variant="text" class="justify-start text-no-wrap" style="width: 100%;" @click="openAddFavoriteDialog">
        <v-icon left>mdi-plus</v-icon>
        <span>Favorit hinzufügen</span>
      </v-btn>
    </div>
  </v-card>
</template>
<script setup lang="ts">
defineProps({
  favorites: Array,
  goToFavorite: Function,
  removeFavorite: Function,
  openAddFavoriteDialog: Function
});
</script>
