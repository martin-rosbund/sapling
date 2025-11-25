
<template>
  <sapling-header />

  <v-skeleton-loader
    v-if="isLoading"
    class="mx-auto transparent"
    elevation="12"
    type="text"/>

  <!-- Search Component -->
  <sapling-search v-else
    :model-value="tableOptions.search ?? ''"
    :entity="entity"
    @update:model-value="onSearchUpdate"
  />

  <sapling-ticket
     :ownPerson="ownPerson"
     :expandedRows="expandedRows"
     :isLoading="isLoading"
     :tickets="tickets"
     :peoples="peoples"
     :companies="companies"
     :companyPeoples="companyPeoples"
     :selectedPeoples="selectedPeoples"
     :selectedCompanies="selectedCompanies"
     :peopleSearch="peopleSearch"
     :companiesSearch="companiesSearch"
    :entity="entity"
    :entityPermission="entityPermission"
    :entityTemplates="entityTemplates"
     :tableOptions="tableOptions"
     :ticketHeaders="ticketHeaders"
     :onSearchUpdate="onSearchUpdate"
     :onPageUpdate="onPageUpdate"
     :onItemsPerPageUpdate="onItemsPerPageUpdate"
     :onSortByUpdate="onSortByUpdate"
     :onTableOptionsUpdate="onTableOptionsUpdate"
     :togglePerson="togglePerson"
     :toggleCompany="toggleCompany"
     :onPeopleSearch="onPeopleSearch"
     :onCompaniesSearch="onCompaniesSearch"
     :onPeoplePage="onPeoplePage"
     :onCompaniesPage="onCompaniesPage"
  />

  <sapling-footer />
</template>

<script lang="ts" setup>
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingHeader from '@/components/SaplingHeader.vue';
import SaplingTicket from '@/components/ticket/SaplingTicket.vue';
import { useSaplingTicket } from '@/composables/ticket/useSaplingTicket';
import SaplingSearch from '@/components/SaplingSearch.vue';

  const {
    ownPerson,
    expandedRows,
    isLoading,
    tickets,
    peoples,
    companies,
    companyPeoples,
    selectedPeoples,
    selectedCompanies,
    peopleSearch,
    companiesSearch,
    entity,
    entityPermission,
    entityTemplates,
    tableOptions,
    ticketHeaders,
    onSearchUpdate,
    onPageUpdate,
    onItemsPerPageUpdate,
    onSortByUpdate,
    onTableOptionsUpdate,
    togglePerson,
    toggleCompany,
    onPeopleSearch,
    onCompaniesSearch,
    onPeoplePage,
    onCompaniesPage,
  } = useSaplingTicket();

</script>