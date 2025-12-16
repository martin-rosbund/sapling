<template>
  <v-navigation-drawer
    v-model="drawer"
    location="right"
    app
    width="340"
    class="sapling-favorites-drawer glass-panel"
    temporary
    style="z-index: 1200; box-shadow: -2px 0 12px rgba(0,0,0,0.15);">
    <v-card flat class="fill-height glass-panel" style="background: transparent; box-shadow: none;">
      <v-card-title class="text-white d-flex align-center justify-space-between">
        <v-icon left>{{ entity?.icon }}</v-icon> {{ $t('navigation.favorite') }}
        <v-btn-group>
          <v-btn icon="mdi-close" class="transparent ml-2" size="small" @click="drawer = false"/>
        </v-btn-group>
      </v-card-title>
      <v-divider></v-divider>

      <div class="sapling-sideboard-list-scroll">
        <v-list dense class="transparent">
          <v-list-item
            v-for="(fav, idx) in favorites"
            :key="fav.handle"
            @click="goToFavorite(fav)">
            <div class="d-flex align-center justify-space-between w-100">
              <div class="d-flex align-center">
                <v-icon class="mr-2">{{ typeof fav.entity === 'object' && fav.entity?.icon ? fav.entity.icon : 'mdi-bookmark' }}</v-icon>
                <span class="ml-1">{{ fav.title }}</span>
              </div>
              <v-btn icon="mdi-delete" size="x-small" class="glass-panel" @click.stop="removeFavorite(idx)"/>
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

      <!-- Add Favorite Dialog -->
      <v-dialog v-model="addFavoriteDialog" max-width="500" class="sapling-add-favorite-dialog">
        <v-card class="glass-panel">
          <v-card-title>{{ $t('global.add') }}</v-card-title>
          <v-card-text>
            <v-form ref="favoriteFormRef">
              <v-text-field
                v-model="newFavoriteTitle"
                :label="$t('favorite.title') + '*'"
                :rules="[v => !!v || $t('favorite.title') + ' ' + $t('global.isRequired')]"
                required
              />
              <v-select
                v-model="selectedFavoriteEntity"
                :menu-props="{ contentClass: 'glass-menu'}"
                :items="entityOptions"
                :label="$t('navigation.entity') + '*'"
                return-object
                :rules="[v => !!v || $t('navigation.entity') + ' ' + $t('global.isRequired')]"
                required
              />
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text @click="addFavoriteDialog = false">{{ $t('global.cancel') }}</v-btn>
            <v-btn color="primary" @click="validateAndAddFavorite">{{ $t('global.add') }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-card>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
//#region Imports
import { useSaplingFavorites } from '@/composables/dashboard/useSaplingFavorites';
import '@/assets/styles/SaplingFavorites.css';
//#endregion


import { ref, watch } from 'vue';
// v-model:drawer support
const props = defineProps<{ drawer: boolean }>();
const emit = defineEmits(['update:drawer']);
const drawer = ref(props.drawer);
watch(() => props.drawer, val => { drawer.value = val; });
watch(drawer, val => { emit('update:drawer', val); });

const {
  entity,
  favorites,
  addFavoriteDialog,
  favoriteFormRef,
  newFavoriteTitle,
  selectedFavoriteEntity,
  entityOptions,
  validateAndAddFavorite,
  openAddFavoriteDialog,
  removeFavorite,
  goToFavorite,
} = useSaplingFavorites();
//#endregion
</script>
