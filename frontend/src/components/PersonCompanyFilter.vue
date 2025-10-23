<template>
  <v-list dense>
    <v-list-subheader>Personen</v-list-subheader>
    <div>
      <div
        v-for="person in people"
        :key="'person-' + getPersonId(person)"
        class="vertical-item"
        :class="{ 'selected': isPersonSelected(getPersonId(person)) }"
        @click="togglePerson(getPersonId(person))"
        style="align-items: center;">
        <v-icon class="mr-1" size="24">mdi-account</v-icon>
        <span style="flex:1">{{ getPersonName(person) }}</span>
        <v-checkbox
          :model-value="isPersonSelected(getPersonId(person))"
          @update:model-value="checked => togglePerson(getPersonId(person), checked)"
          hide-details
          density="compact"
          class="ml-1"
          @click.stop
          :ripple="false"
          style="pointer-events: none;"
        />
      </div>
    </div>
    <v-divider class="my-2"></v-divider>
    <template v-if="companies && companies.length > 0">
      <v-list-subheader>Firmen</v-list-subheader>
      <div>
        <div
          v-for="company in companies"
          :key="'company-' + company.handle"
          class="vertical-item"
          :class="{ 'selected': isCompanySelected(company.handle) }"
          @click="toggleCompany(company.handle)"
          style="align-items: center;"
        >
          <v-icon class="mr-1" size="24">mdi-domain</v-icon>
          <span style="flex:1">{{ company.name }}</span>
          <v-checkbox
            :model-value="isCompanySelected(company.handle)"
            @update:model-value="checked => toggleCompany(company.handle, checked)"
            hide-details
            density="compact"
            class="ml-1"
            @click.stop
            :ripple="false"
            style="pointer-events: none;"
          />
        </div>
      </div>
    </template>
  </v-list>
</template>

<script setup lang="ts">
import type { CompanyItem, PersonItem } from '@/entity/entity';
import { defineProps, defineEmits } from 'vue';

type PersonProp = PersonItem;

const props = defineProps<{
  people: PersonProp[];
  companies: CompanyItem[];
  selectedPeople?: number[];
  selectedCompanies?: number[];
  selectedFilters?: (number | string)[];
}>();

const emit = defineEmits([
  'togglePerson',
  'toggleCompany',
]);

function isPersonSelected(id: number) {
  if (props.selectedPeople) return props.selectedPeople.includes(id);
  if (props.selectedFilters) return props.selectedFilters.includes(id);
  return false;
}

function getPersonId(person: PersonProp): number {
  return person.handle || 0;
}
function getPersonName(person: PersonProp): string {
  return person.firstName + ' ' + person.lastName;
}
function isCompanySelected(id: number) {
  if (props.selectedCompanies) return props.selectedCompanies.includes(id);
  if (props.selectedFilters) return props.selectedFilters.includes('company-' + id);
  return false;
}
function togglePerson(id: number, checked?: boolean | null) {
  emit('togglePerson', id, checked ?? undefined);
}
function toggleCompany(id: number, checked?: boolean | null) {
  emit('toggleCompany', id, checked ?? undefined);
}
</script>

<style scoped>
.sideboard {
  border-left: 1px solid #e0e0e0;
  margin-right: 0 !important;
  padding-right: 0 !important;
  right: 0;
}
.sideboard-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.favorite-item {
  cursor: pointer;
}
.v-list-item--active {
  background: #e0e0e01a !important;
}
.vertical-item {
  display: flex;
  align-items: center;
  border-radius: 18px;
  padding: 4px 10px 4px 4px;
  cursor: pointer;
  transition: 0.2s;
  margin-bottom: 8px;
}
.vertical-item.selected {
  background: #e0e0e01a;
  border: 1px solid #1976d2;
}
</style>