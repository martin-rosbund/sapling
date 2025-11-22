
<template>
  <div class="sapling-accordion-scroll-wrapper">
    <v-expansion-panels multiple v-model="expandedPanels">
    <v-expansion-panel v-if="ownPerson" class="transparent">
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
    <v-expansion-panel v-if="companyPeople && companyPeople.length > 0"  class="transparent">
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
    <v-expansion-panel  class="transparent">
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
    <v-expansion-panel  class="transparent">
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
import { defineProps, defineEmits } from 'vue';
import SaplingMeFilter from './SaplingMeFilter.vue';
import SaplingEmployeeFilter from './SaplingEmployeeFilter.vue';
import SaplingPersonFilter from './SaplingPersonFilter.vue';
import SaplingCompanyFilter from './SaplingCompanyFilter.vue';
import '../../assets/styles/SaplingWorkFilter.css';
import { useSaplingWorkFilter } from '@/composables/filter/useSaplingWorkFilter';
// #endregion

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

const {
  isPersonSelected,
  getPersonId,
  getPersonName,
  isCompanySelected,
  togglePerson,
  toggleCompany,
  expandedPanels,
} = useSaplingWorkFilter(props, emit);
</script>