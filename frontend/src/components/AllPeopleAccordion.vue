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
      v-for="person in people"
      :key="'person-' + getPersonId(person)"
      class="vertical-item compact-item"
      :class="{ 'selected': isPersonSelected(getPersonId(person)) }"
      @click="togglePerson(getPersonId(person))">
      <v-icon class="mr-1" size="20">mdi-account</v-icon>
      <span class="person-name">{{ getPersonName(person) }}</span>
      <v-checkbox
        :model-value="isPersonSelected(getPersonId(person))"
        @update:model-value="checked => togglePerson(getPersonId(person), checked)"
        hide-details
        density="comfortable"
        class="ml-1 checkbox-no-pointer compact-checkbox"
        @click.stop
        :ripple="false"
      />
    </div>
  </div>
  <div class="section-padding-top">
    <v-pagination
      v-if="(peopleTotal ?? 0) > (peoplePageSize)"
      :model-value="peoplePage ?? 1"
      :length="Math.ceil((peopleTotal ?? 0) / (peoplePageSize))"
      @update:model-value="val => emit('pagePeople', val)"
      density="compact"
      class="margin-4-0"
    />
  </div>
</template>

<script setup lang="ts">
import type { PersonItem } from '@/entity/entity';
import { defineProps, defineEmits } from 'vue';
const props = defineProps<{ people: PersonItem[], peopleTotal?: number, peopleSearch?: string, peoplePage?: number, peoplePageSize: number, isPersonSelected: (id: number) => boolean, getPersonId: (person: PersonItem) => number, getPersonName: (person: PersonItem) => string }>();
const emit = defineEmits(['togglePerson', 'searchPeople', 'pagePeople']);
function togglePerson(id: number, checked?: boolean | null) {
  emit('togglePerson', id, checked ?? undefined);
}
</script>
