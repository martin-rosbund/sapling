<template>
  <SaplingDrawer v-model="drawer">
    <v-card flat style="display: flex; flex-direction: column; height: 100%;">
      <v-card-title class="text-white d-flex align-center justify-space-between">
        <v-icon left>{{ entity?.icon }}</v-icon> {{ $t('navigation.favorite') }}
      </v-card-title>
      <v-divider></v-divider>

      <v-list density="comfortable" style="flex: 1 1 auto; overflow-y: auto; min-height: 0;">
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
      <v-divider></v-divider>

      <div class="d-flex align-end w-100">
        <v-btn block color="primary" variant="text" class="d-flex align-center justify-center" @click="openAddFavoriteDialog">
          <v-icon left>mdi-plus-circle</v-icon>
          <span>{{ $t('global.add') }}</span>
        </v-btn>
      </div>

      <SaplingDialogFavorite
        :addFavoriteDialog="addFavoriteDialog"
        @update:addFavoriteDialog="val => addFavoriteDialog = val"
        :entityOptions="entityOptions"
        :newFavoriteTitle="newFavoriteTitle"
        @update:newFavoriteTitle="val => newFavoriteTitle = val"
        :selectedFavoriteEntity="selectedFavoriteEntity"
        @update:selectedFavoriteEntity="val => selectedFavoriteEntity = val"
        @addFavorite="addFavorite"
      />
    </v-card>
  </SaplingDrawer>
</template>

<script setup lang="ts">
// #region Imports
import { useSaplingFavorites } from '@/composables/dashboard/useSaplingFavorites';
import SaplingDrawer from '@/components/common/SaplingDrawer.vue';
import SaplingDialogFavorite from '@/components/dialog/SaplingDialogFavorite.vue';
import { ref, watch } from 'vue';
// #endregion

const props = defineProps<{ drawer: boolean }>();
const emit = defineEmits(['update:drawer']);
const drawer = ref(props.drawer);
watch(() => props.drawer, val => { drawer.value = val; });
watch(drawer, val => { emit('update:drawer', val); });

// #region Composable
const {
  entity,
  favorites,
  addFavoriteDialog,
  newFavoriteTitle,
  selectedFavoriteEntity,
  entityOptions,
  openAddFavoriteDialog,
  removeFavorite,
  goToFavorite,
  addFavorite,
} = useSaplingFavorites();
// #endregion
</script>