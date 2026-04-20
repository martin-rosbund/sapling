<template>
  <div class="sapling-vertical-item sapling-vertical-item-static">
    <v-icon class="mr-1" size="20">mdi-account-circle</v-icon>
    <span class="sapling-person-name">{{ getPersonName(ownPerson) }}</span>
    <v-checkbox
      :model-value="isPersonSelected(getPersonId(ownPerson))"
      @update:model-value="(checked) => togglePerson(getPersonId(ownPerson), checked)"
      hide-details
      density="comfortable"
      class="sapling-filter-checkbox checkbox-no-pointer"
      @click.stop
      :ripple="false"
    />
  </div>
</template>

<script setup lang="ts">
// #region Imports
import {
  useSaplingFilterMe,
  type UseSaplingFilterMeEmit,
  type UseSaplingFilterMeProps,
} from '@/composables/filter/useSaplingFilterMe'
// #endregion

// #region Props and Emits
const props = defineProps<UseSaplingFilterMeProps>()
const emit = defineEmits<UseSaplingFilterMeEmit>()
// #endregion

const { ownPerson, isPersonSelected, getPersonId, getPersonName, togglePerson } =
  useSaplingFilterMe(props, emit)
</script>
