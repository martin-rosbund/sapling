<template>
  <!-- Container for the search input field -->
  <div>
    <!-- Search input field -->
    <v-text-field
      :model-value="localSearch"
      @update:model-value="onSearchUpdate"
      :label="$t(`navigation.${entity?.handle}`)"
      :prepend-inner-icon="entity?.icon || 'mdi-magnify'"
      hide-details
      single-line
    />
  </div>
</template>

<script lang="ts" setup>
  //#region Imports
  import { useSaplingSearch } from '@/composables/useSaplingSearch'; // Import the composable for search logic
  import type { EntityItem } from '@/entity/entity';

  // Props and Emits
  interface SaplingSearchProps {
    modelValue: string; // Prop for the search input value
    entity: EntityItem | null; // Prop for the entity information
  }
  
  const props = defineProps<SaplingSearchProps>(); // Define the props for the component
  const emit = defineEmits(['update:model-value']); // Define the events emitted by the component
  //#endregion

  //#region Composable
  // Use the composable to manage the search logic
  const { localSearch, onSearchUpdate } = useSaplingSearch(props.modelValue, emit);
  //#endregion
</script>