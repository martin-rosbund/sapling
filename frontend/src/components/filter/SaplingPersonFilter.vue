<template>
  <div class="section-padding-bottom">
    <v-text-field
      :model-value="peopleSearch ?? ''"
      :label="$t ? $t('global.search') : 'Suchen'"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      hide-details
      single-line
      density="compact"
      class="margin-bottom-4"
      @update:model-value="val => emit('searchPeople', val)"
    />
  </div>
  <div>
    <div
      v-for="person in people?.data"
      :key="'person-' + getPersonId(person)"
      class="sapling-vertical-item"
      :class="{ 'selected': isPersonSelected(getPersonId(person)) }"
      @click="togglePerson(getPersonId(person))">
      <v-icon class="mr-1" size="20">mdi-account</v-icon>
      <span class="sapling-person-name">{{ getPersonName(person) }}</span>
      <v-checkbox
        :model-value="isPersonSelected(getPersonId(person))"
        @update:model-value="checked => togglePerson(getPersonId(person), checked)"
        hide-details
        density="comfortable"
        class="ml-1 checkbox-no-pointer"
        @click.stop
        :ripple="false"
      />
    </div>
  </div>
  <div class="section-padding-top">
    <v-pagination
      v-if="(people?.meta.total ?? 0) > (people?.meta?.limit ?? 0)"
      :model-value="people?.meta.page ?? 1"
      :length="Math.ceil((people?.meta.total ?? 0) / (people?.meta?.limit ?? 0))"
      @update:model-value="val => emit('pagePeople', val)"
      density="compact"
      class="margin-4-0"
    />
  </div>
</template>

<script setup lang="ts">
// #region Imports
import type { PersonItem } from '@/entity/entity';
import { useSaplingPersonFilter } from '@/composables/filter/useSaplingPersonFilter';
import type { PaginatedResponse } from '@/entity/structure';
// #endregion

// #region Props and Emits
const props = defineProps<{
  people: PaginatedResponse<PersonItem> | undefined,
  peopleSearch?: string,
  isPersonSelected: (id: number) => boolean,
  getPersonId: (person: PersonItem) => number,
  getPersonName: (person: PersonItem) => string
}>();

const emit = defineEmits(['togglePerson', 'searchPeople', 'pagePeople']);
// #endregion

const {
  togglePerson,
} = useSaplingPersonFilter(props, emit);
</script>
