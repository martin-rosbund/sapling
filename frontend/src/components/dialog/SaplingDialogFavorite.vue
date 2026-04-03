<template>
  <v-dialog
    :model-value="addFavoriteDialog"
    @update:model-value="val => emit('update:addFavoriteDialog', val)"
    max-width="500"
  >
    <v-card class="glass-panel">
      <v-card-title>{{ $t('global.add') }}</v-card-title>
      <v-card-text>
        <v-form ref="formRef">
          <v-text-field
            :model-value="newFavoriteTitle"
            @update:model-value="val => emit('update:newFavoriteTitle', val)"
            :label="$t('favorite.title') + '*'"
            :rules="[v => !!v || $t('favorite.title') + ' ' + $t('global.isRequired')]"
            required
          />
          <v-select
            :model-value="selectedFavoriteEntity"
            @update:model-value="val => emit('update:selectedFavoriteEntity', val)"
            :menu-props="{ contentClass: 'glass-menu'}"
            :items="entityOptions"
            :label="$t('navigation.entity') + '*'"
            return-object
            :rules="[v => !!v || $t('navigation.entity') + ' ' + $t('global.isRequired')]"
            required
          />
        </v-form>
      </v-card-text>
      <sapling-action-save :cancel="() => emit('update:addFavoriteDialog', false)" :save="onSave" />
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
// #region Imports
import { ref } from 'vue';
import SaplingActionSave from '../actions/SaplingActionSave.vue';
import type { EntityItem } from '@/entity/entity';
// #endregion

// #region Props & Emits
defineProps<{
  addFavoriteDialog: boolean,
  newFavoriteTitle: string,
  selectedFavoriteEntity: EntityItem | null,
  entityOptions: EntityItem[],
}>();
const emit = defineEmits(['update:addFavoriteDialog', 'update:newFavoriteTitle', 'update:selectedFavoriteEntity', 'addFavorite']);
// #endregion

// #region State
const formRef = ref();
// #endregion

// #region Methods
const onSave = async () => {
  const validationResult = await formRef.value?.validate();
  const isValid = typeof validationResult === 'boolean'
    ? validationResult
    : validationResult?.valid === true;

  if (isValid) {
    emit('addFavorite');
    emit('update:addFavoriteDialog', false);
  }
};
// #endregion
</script>
