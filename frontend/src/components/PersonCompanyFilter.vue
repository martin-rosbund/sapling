
<template>
  <div class="sapling-accordion-scroll-wrapper">
    <v-expansion-panels multiple v-model="expandedPanels">
    <v-expansion-panel v-if="ownPerson">
      <v-expansion-panel-title>
        <v-list-subheader>{{$t('global.me')}}</v-list-subheader>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <OwnPersonAccordion
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
        <CompanyPeopleAccordion
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
        <AllPeopleAccordion
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
        <AllCompaniesAccordion
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
  import OwnPersonAccordion from './OwnPersonAccordion.vue';
  import CompanyPeopleAccordion from './CompanyPeopleAccordion.vue';
  import AllPeopleAccordion from './AllPeopleAccordion.vue';
  import AllCompaniesAccordion from './AllCompaniesAccordion.vue';
  import '../assets/styles/PersonCompanyFilter.css';
  // #endregion Imports

  // #region Constants
  const COMPANY_PREFIX = 'company-';
  // #endregion Constants

  // #region Props & Emits
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
  // #endregion Props & Emits

  // #region Methods
  function isPersonSelected(id: number) {
    if (props.selectedPeople) return props.selectedPeople.includes(id);
    if (props.selectedFilters) return props.selectedFilters.includes(id);
    return false;
  }

  function getPersonId(person: PersonItem): number {
    return person.handle || 0;
  }

  function getPersonName(person: PersonItem): string {
    return person.firstName + ' ' + person.lastName;
  }

  function isCompanySelected(id: number) {
    if (props.selectedCompanies) return props.selectedCompanies.includes(id);
    if (props.selectedFilters) return props.selectedFilters.includes(COMPANY_PREFIX + id);
    return false;
  }

  function togglePerson(id: number, checked?: boolean | null) {
    emit('togglePerson', id, checked ?? undefined);
  }

  function toggleCompany(id: number, checked?: boolean | null) {
    emit('toggleCompany', id, checked ?? undefined);
  }
  // #endregion Methods

// Accordion Panel State: 0=Eigene Person, 1=Firmenpersonen, 2=Alle Personen, 3=Alle Firmen
const expandedPanels = ref([0, 1]); // Standard: Eigene Person & Firmenpersonen offen
</script>