
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
    <v-expansion-panel v-if="companyPeoples?.data && companyPeoples.data.length > 0"  class="transparent">
      <v-expansion-panel-title>
        <v-list-subheader>{{ $t('global.employee')}}</v-list-subheader>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <SaplingEmployeeFilter
          :companyPeoples="companyPeoples"
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
          :people="peoples"
          :peopleSearch="peopleSearch"
          :isPersonSelected="isPersonSelected"
          :getPersonId="getPersonId"
          :getPersonName="getPersonName"
          @togglePerson="togglePerson"
          @searchPeople="onPeopleSearch"
          @pagePeople="onPeoplePage"
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
          :companiesSearch="companiesSearch"
          :isCompanySelected="isCompanySelected"
          @toggleCompany="toggleCompany"
          @searchCompanies="onCompaniesSearch"
          @pageCompanies="onCompaniesPage"
        />
      </v-expansion-panel-text>
    </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>


<script setup lang="ts">
// #region Imports
import { watch, defineEmits } from 'vue';
import SaplingMeFilter from '@/components/filter/SaplingMeFilter.vue';
import SaplingEmployeeFilter from '@/components/filter/SaplingEmployeeFilter.vue';
import SaplingPersonFilter from '@/components/filter/SaplingPersonFilter.vue';
import SaplingCompanyFilter from '@/components/filter/SaplingCompanyFilter.vue';
import '@/assets/styles/SaplingWorkFilter.css';
import { useSaplingWorkFilter } from '@/composables/filter/useSaplingWorkFilter';
// #endregion

const {
    isPersonSelected,
    getPersonId,
    getPersonName,
    isCompanySelected,
    togglePerson,
    toggleCompany,
    onPeopleSearch,
    onCompaniesSearch,
    onPeoplePage,
    onCompaniesPage,
    ownPerson,
    peoples,
    companies,
    companyPeoples,
    selectedPeoples,
    selectedCompanies,
    peopleSearch,
    companiesSearch,
    expandedPanels,
} = useSaplingWorkFilter();

const emit = defineEmits(['update:selectedPeoples', 'update:selectedCompanies']);

watch(selectedPeoples, (val) => {
  emit('update:selectedPeoples', val);
});

watch(selectedCompanies, (val) => {
  emit('update:selectedCompanies', val);
});
</script>