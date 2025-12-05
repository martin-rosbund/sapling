<template>
  <div class="d-flex align-center">
    <v-icon class="mr-1" size="20">mdi-account-circle</v-icon>
    <span class="sapling-person-name">{{ getPersonName(ownPerson) }}</span>
    <v-checkbox
      :model-value="isPersonSelected(getPersonId(ownPerson))"
      @update:model-value="checked => togglePerson(getPersonId(ownPerson), checked)"
      hide-details
      density="comfortable"
      class="ml-1 checkbox-no-pointer"
      @click.stop
      :ripple="false"
    />
  </div>
</template>

<script setup lang="ts">
// #region Imports
import type { PersonItem } from '@/entity/entity';
import { useSaplingMeFilter } from '@/composables/filter/useSaplingMeFilter';
// #endregion

// #region Props and Emits
const props = defineProps<{
  ownPerson: PersonItem,
  isPersonSelected: (id: number) => boolean,
  getPersonId: (person: PersonItem) => number,
  getPersonName: (person: PersonItem) => string
}>();

const emit = defineEmits(['togglePerson']);
// #endregion

const { togglePerson } = useSaplingMeFilter(props, emit);
</script>
