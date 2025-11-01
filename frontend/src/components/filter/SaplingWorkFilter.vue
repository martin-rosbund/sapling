
<template>
  <div class="sapling-accordion-scroll-wrapper">
    <v-expansion-panels multiple v-model="expandedPanels">
    <v-expansion-panel v-if="ownPerson">
      <v-expansion-panel-title>
        <v-list-subheader>{{$t('global.me')}}</v-list-subheader>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <SaplingMeFilter
          :ownPerson="ownPerson"
          :isPersonSelected="isPersonSelected"
          :getPersonId="getPersonId"
          :getPersonName="getPersonName"
          @togglePerson="togglePerson"
        />
      </v-expansion-panel-text>
    </v-expansion-panel>
    <v-expansion-panel v-if="companyPeople && companyPeople.length > 0">
      <v-expansion-panel-title>
        <v-list-subheader>{{ $t('global.employee')}}</v-list-subheader>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <SaplingEmployeeFilter
          :companyPeople="companyPeople"
          :isPersonSelected="isPersonSelected"
          :getPersonId="getPersonId"
          :getPersonName="getPersonName"
          @togglePerson="togglePerson"
        />
      </v-expansion-panel-text>
    </v-expansion-panel>
    <v-expansion-panel>
      <v-expansion-panel-title>
        <v-list-subheader>{{$t('navigation.person')}}</v-list-subheader>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <SaplingPersonFilter
          :people="people"
          :peopleTotal="peopleTotal"
          :peopleSearch="props.peopleSearch"
          :peoplePage="props.peoplePage"
          :peoplePageSize="props.peoplePageSize"
          :isPersonSelected="isPersonSelected"
          :getPersonId="getPersonId"
          :getPersonName="getPersonName"
          @togglePerson="togglePerson"
          @searchPeople="val => emit('searchPeople', val)"
          @pagePeople="val => emit('pagePeople', val)"
        />
      </v-expansion-panel-text>
    </v-expansion-panel>
    <v-expansion-panel>
      <v-expansion-panel-title>
        <v-list-subheader>{{$t('navigation.company')}}</v-list-subheader>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <SaplingCompanyFilter
          :companies="companies"
          :companiesTotal="companiesTotal"
          :companiesSearch="props.companiesSearch"
          :companiesPage="props.companiesPage"
          :companiesPageSize="props.companiesPageSize"
          :isCompanySelected="isCompanySelected"
          @toggleCompany="toggleCompany"
          @searchCompanies="val => emit('searchCompanies', val)"
          @pageCompanies="val => emit('pageCompanies', val)"
        />
      </v-expansion-panel-text>
    </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>


<script setup lang="ts">
// #region Imports
import type { CompanyItem, PersonItem } from '@/entity/entity';
import { defineProps, defineEmits, ref } from 'vue';
import SaplingMeFilter from './SaplingMeFilter.vue';
import SaplingEmployeeFilter from './SaplingEmployeeFilter.vue';
import SaplingPersonFilter from './SaplingPersonFilter.vue';
import SaplingCompanyFilter from './SaplingCompanyFilter.vue';
import '../../assets/styles/SaplingWorkFilter.css';
// #endregion

// #region Constants
const COMPANY_PREFIX = 'company-';
// #endregion

// #region Props and Emits
const props = defineProps<{
  people: PersonItem[];
  companies: CompanyItem[];
  companyPeople?: PersonItem[];
  ownPerson?: PersonItem | null;
  peopleTotal?: number;
  peopleSearch?: string;
  peoplePage?: number;
  peoplePageSize: number;
  companiesTotal?: number;
  companiesSearch?: string;
  companiesPage?: number;
  companiesPageSize: number;
  selectedPeople?: number[];
  selectedCompanies?: number[];
  selectedFilters?: (number | string)[];
}>();

const emit = defineEmits([
  'togglePerson',
  'toggleCompany',
  'searchPeople',
  'searchCompanies',
  'pagePeople',
  'pageCompanies',
]);
// #endregion

// #region Methods
/**
 * Checks if a person is selected based on selectedPeople or selectedFilters.
 */
function isPersonSelected(id: number) {
  if (props.selectedPeople) return props.selectedPeople.includes(id);
  if (props.selectedFilters) return props.selectedFilters.includes(id);
  return false;
}

/**
 * Returns the unique id for a person.
 */
function getPersonId(person: PersonItem): number {
  return person.handle || 0;
}

/**
 * Returns the display name for a person.
 */
function getPersonName(person: PersonItem): string {
  return person.firstName + ' ' + person.lastName;
}

/**
 * Checks if a company is selected based on selectedCompanies or selectedFilters.
 */
function isCompanySelected(id: number) {
  if (props.selectedCompanies) return props.selectedCompanies.includes(id);
  if (props.selectedFilters) return props.selectedFilters.includes(COMPANY_PREFIX + id);
  return false;
}

/**
 * Emits the togglePerson event with the person id and checked state.
 */
function togglePerson(id: number, checked?: boolean | null) {
  emit('togglePerson', id, checked ?? undefined);
}

/**
 * Emits the toggleCompany event with the company id and checked state.
 */
function toggleCompany(id: number, checked?: boolean | null) {
  emit('toggleCompany', id, checked ?? undefined);
}
// #endregion

// #region State
// Accordion Panel State: 0=Own Person, 1=Company People, 2=All People, 3=All Companies
const expandedPanels = ref([0, 1]); // Default: Own Person & Company People open
// #endregion
</script>