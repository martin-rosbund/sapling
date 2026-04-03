<template>
  <!-- Dialog for creating a new favorite entry -->
  <v-dialog
    :model-value="addFavoriteDialog"
    @update:model-value="handleDialogUpdate"
    max-width="500"
  >
    <v-card class="glass-panel">
      <v-card-title>{{ $t('global.add') }}</v-card-title>
      <v-card-text>
        <v-form ref="formRef">
          <v-text-field
            :model-value="newFavoriteTitle"
            @update:model-value="handleFavoriteTitleUpdate"
            :label="$t('favorite.title') + '*'"
            :rules="titleRules"
            required
          />
          <v-select
            :model-value="selectedFavoriteEntity"
            @update:model-value="handleSelectedFavoriteEntityUpdate"
            :menu-props="{ contentClass: 'glass-menu'}"
            :items="entityOptions"
            :label="$t('navigation.entity') + '*'"
            return-object
            :rules="entityRules"
            required
          />
        </v-form>
      </v-card-text>
      <SaplingActionSave :cancel="handleCancel" :save="handleSave" />
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
// #region Imports
import { useSaplingDialogFavorite } from '@/composables/dialog/useSaplingDialogFavorite';
import SaplingActionSave from '../actions/SaplingActionSave.vue';
import type { EntityItem } from '@/entity/entity';
// #endregion

// #region Props & Emits
defineProps<{
  addFavoriteDialog: boolean;
  newFavoriteTitle: string;
  selectedFavoriteEntity: EntityItem | null;
  entityOptions: EntityItem[];
}>();
const emit = defineEmits<{
  (event: 'update:addFavoriteDialog', value: boolean): void;
  (event: 'update:newFavoriteTitle', value: string): void;
  (event: 'update:selectedFavoriteEntity', value: EntityItem | null): void;
  (event: 'addFavorite'): void;
}>();
// #endregion

// #region Composable
const {
  formRef,
  titleRules,
  entityRules,
  handleDialogUpdate,
  handleFavoriteTitleUpdate,
  handleSelectedFavoriteEntityUpdate,
  handleCancel,
  handleSave,
} = useSaplingDialogFavorite(emit);
// #endregion
</script>
