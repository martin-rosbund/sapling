<template>
  <div>
    <div
      v-for="person in companyPeople"
      :key="'company-person-' + getPersonId(person)"
      class="vertical-item compact-item"
      :class="{ 'selected': isPersonSelected(getPersonId(person)) }"
      @click="togglePerson(getPersonId(person))">
      <v-icon class="mr-1" size="20">account-supervisor</v-icon>
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
</template>

<script setup lang="ts">
import type { PersonItem } from '@/entity/entity';
import { defineProps, defineEmits } from 'vue';
const props = defineProps<{ companyPeople: PersonItem[], isPersonSelected: (id: number) => boolean, getPersonId: (person: PersonItem) => number, getPersonName: (person: PersonItem) => string }>();
const emit = defineEmits(['togglePerson']);
function togglePerson(id: number, checked?: boolean | null) {
  emit('togglePerson', id, checked ?? undefined);
}
</script>
