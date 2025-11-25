
<template>
  <sapling-header />

  <v-skeleton-loader
    v-if="isLoading"
    class="mx-auto transparent"
    elevation="12"
    type="text"/>

  <!-- Search Component -->
  <sapling-search v-else
    :model-value="search"
    :entity="entity"
    @update:model-value="onSearchUpdate"
  />

  <sapling-ticket
    :own-person="ownPerson"
    :expanded-rows="expandedRows"
    :is-loading="isLoading"
    :tickets="tickets"
    :peoples="peoples"
    :companies="companies"
    :company-peoples="companyPeoples"
    :selected-peoples="selectedPeoples"
    :selected-companies="selectedCompanies"
    :people-search="peopleSearch"
    :companies-search="companiesSearch"
    :entity="entity"
    :table-options="tableOptions"
    :ticket-headers="ticketHeaders"
    :search="search"   
    @update:page="onPageUpdate"
    @update:items-per-page="onItemsPerPageUpdate"
    @update:sort-by="onSortByUpdate"
    @update:expandedRows="(val: any) => expandedRows = val"
    @update:tableOptions="onTableOptionsUpdate"
    @togglePerson="togglePerson"
    @toggleCompany="toggleCompany"
    @searchPeople="onPeopleSearch"
    @searchCompanies="onCompaniesSearch"
    @pagePeople="onPeoplePage"
    @pageCompanies="onCompaniesPage"/>

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
    tableOptions,
    ticketHeaders,
    search,
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