
<template>
  <sapling-header />
  
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
    :format-rich-text="formatRichText"
    :format-date-time="formatDateTime"
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

<script lang="ts">
import { defineComponent } from 'vue';
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingHeader from '@/components/SaplingHeader.vue';
import SaplingTicket from '@/components/ticket/SaplingTicket.vue';
import { useSaplingTicket } from '@/composables/ticket/useSaplingTicket';

export default defineComponent({
  name: 'TicketView',
  components: {
    SaplingHeader,
    SaplingFooter,
    SaplingTicket
  },
  setup() {
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
      tableOptions,
      ticketHeaders,
      onTableOptionsUpdate,
      formatRichText,
      formatDateTime,
      togglePerson,
      toggleCompany,
      onPeopleSearch,
      onCompaniesSearch,
      onPeoplePage,
      onCompaniesPage,
    } = useSaplingTicket();
    return {
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
      tableOptions,
      ticketHeaders,
      onTableOptionsUpdate,
      formatRichText,
      formatDateTime,
      togglePerson,
      toggleCompany,
      onPeopleSearch,
      onCompaniesSearch,
      onPeoplePage,
      onCompaniesPage,
    };
  }
});
</script>