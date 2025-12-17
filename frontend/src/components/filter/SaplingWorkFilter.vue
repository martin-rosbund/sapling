
<template>
  <SaplingDrawer v-model="drawerOpen">
    <v-card flat class="glass-panel" style="background: transparent; box-shadow: none; display: flex; flex-direction: column; height: 100%;">
      <v-card-title class="sapling-ticket-sideboard-title text-white d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon left>mdi-account-group</v-icon> {{ $t('navigation.person') + ' & ' + $t('navigation.company') }}
        </div>
        <v-btn-group>
          <v-btn icon="mdi-close" class="transparent ml-2" size="small" @click="drawerOpen = false"/>
        </v-btn-group>
      </v-card-title>
      <v-divider></v-divider>
      <div class="sapling-ticket-sideboard-list-scroll d-flex flex-column" style="flex: 1 1 auto; overflow-y: auto; min-height: 0;">
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
      </div>
    </v-card>
  </SaplingDrawer>
</template>

<script setup lang="ts">

import { ref, watch } from 'vue';
import SaplingDrawer from '@/components/common/SaplingDrawer.vue';
import SaplingMeFilter from '@/components/filter/SaplingMeFilter.vue';
import SaplingEmployeeFilter from '@/components/filter/SaplingEmployeeFilter.vue';
import SaplingPersonFilter from '@/components/filter/SaplingPersonFilter.vue';
import SaplingCompanyFilter from '@/components/filter/SaplingCompanyFilter.vue';
import '@/assets/styles/SaplingWorkFilter.css';
import { useSaplingWorkFilter } from '@/composables/filter/useSaplingWorkFilter';

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

const drawerOpen = ref(false);

const emit = defineEmits(['update:selectedPeoples', 'update:selectedCompanies']);

watch(selectedPeoples, (val) => {
  emit('update:selectedPeoples', val);
});

watch(selectedCompanies, (val) => {
  emit('update:selectedCompanies', val);
});
</script>