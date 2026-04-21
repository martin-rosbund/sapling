<template>
  <!-- Dialog for creating a new favorite entry -->
  <v-dialog
    :model-value="addFavoriteDialog"
    @update:model-value="handleDialogUpdate"
    max-width="500"
  >
    <v-card
      class="glass-panel tilt-content sapling-dialog-compact-card"
      v-tilt="TILT_DEFAULT_OPTIONS"
      elevation="12"
    >
      <div class="sapling-dialog-shell">
        <SaplingDialogHero
          :eyebrow="$t('global.add')"
          :title="$t('navigation.favorite')"
          :subtitle="favoriteSubtitle"
        />

        <div class="sapling-dialog-form-body">
          <v-form ref="formRef" class="sapling-dialog-form">
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
              :menu-props="{ contentClass: 'glass-menu' }"
              :items="entityOptions"
              :label="$t('navigation.entity') + '*'"
              return-object
              :rules="entityRules"
              required
            />
          </v-form>
        </div>
        <SaplingActionSave :cancel="handleCancel" :save="handleSave" />
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
// #region Imports
import { computed } from 'vue'
import { useSaplingDialogFavorite } from '@/composables/dialog/useSaplingDialogFavorite'
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants'
import SaplingActionSave from '../actions/SaplingActionSave.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import type { EntityItem } from '@/entity/entity'
// #endregion

// #region Props & Emits
const props = defineProps<{
  addFavoriteDialog: boolean
  newFavoriteTitle: string
  selectedFavoriteEntity: EntityItem | null
  entityOptions: EntityItem[]
}>()
const emit = defineEmits<{
  (event: 'update:addFavoriteDialog', value: boolean): void
  (event: 'update:newFavoriteTitle', value: string): void
  (event: 'update:selectedFavoriteEntity', value: EntityItem | null): void
  (event: 'addFavorite'): void
}>()
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
} = useSaplingDialogFavorite(emit)

const favoriteSubtitle = computed(() => {
  const favoriteTitle = props.newFavoriteTitle.trim()

  if (favoriteTitle) {
    return favoriteTitle
  }

  return props.selectedFavoriteEntity?.handle || ''
})
// #endregion
</script>
