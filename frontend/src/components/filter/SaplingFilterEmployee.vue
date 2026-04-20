<template>
  <div>
    <div
      v-for="person in companyPeoples?.data"
      :key="'company-person-' + getPersonId(person)"
      class="sapling-vertical-item"
      :class="{ selected: isPersonSelected(getPersonId(person)) }"
      @click="togglePerson(getPersonId(person))"
    >
      <v-icon class="mr-1" size="20">mdi-account-supervisor</v-icon>
      <span class="sapling-person-name">{{ getPersonName(person) }}</span>
      <v-checkbox
        :model-value="isPersonSelected(getPersonId(person))"
        @update:model-value="(checked) => togglePerson(getPersonId(person), checked)"
        hide-details
        density="comfortable"
        class="sapling-filter-checkbox checkbox-no-pointer"
        @click.stop
        :ripple="false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// #region Imports
import {
  useSaplingFilterEmployee,
  type UseSaplingFilterEmployeeEmit,
  type UseSaplingFilterEmployeeProps,
} from '@/composables/filter/useSaplingFilterEmployee'
// #endregion

// #region Props and Emits
const props = defineProps<UseSaplingFilterEmployeeProps>()
const emit = defineEmits<UseSaplingFilterEmployeeEmit>()
// #endregion

const { companyPeoples, isPersonSelected, getPersonId, getPersonName, togglePerson } =
  useSaplingFilterEmployee(props, emit)
</script>
