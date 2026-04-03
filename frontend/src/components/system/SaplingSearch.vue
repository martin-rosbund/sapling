<template>
  <!-- Container for the search input field -->
  <div class="sapling-search">
    <!-- Search input field -->
    <v-text-field
      :model-value="localSearch"
      @update:model-value="onSearchUpdate"
      :label="entity ? $t(`navigation.${entity.handle}`) : $t('global.search')"
      :prepend-inner-icon="entity?.icon || 'mdi-magnify'"
      hide-details
      single-line
    />
  </div>
</template>

<script lang="ts" setup>
  //#region Imports
  import { useSaplingSearch } from '@/composables/system/useSaplingSearch';
  import type { EntityItem } from '@/entity/entity';
  import { toRef } from 'vue';

  // Props and Emits
  interface SaplingSearchProps {
    modelValue: string;
    entity: EntityItem | null;
  }
  
  const props = defineProps<SaplingSearchProps>();
  const emit = defineEmits<{
    (event: 'update:model-value', value: string): void;
  }>();
  //#endregion

  //#region Composable
  const { localSearch, onSearchUpdate } = useSaplingSearch(toRef(props, 'modelValue'), emit);
  //#endregion
</script>