
<template>
  <v-container class="sapling-ticket-container pa-0 no-gutters" fluid>
    <v-skeleton-loader
      v-if="isLoading"
      elevation="12"
      class="fill-height glass-panel"
      type="article, actions, table"/>
    <template v-else>
      <v-row class="sapling-ticket-row fill-height" no-gutters>
        <!-- Ticketliste -->
        <v-col cols="12" md="9" class="sapling-ticket-main-table-col d-flex flex-column">
          <v-card flat class="sapling-ticket-main-table-card rounded-0 d-flex flex-column transparent">
            <v-card-text class="sapling-ticket-table-text pa-0 flex-grow-1">
              <div class="sapling-ticket-table-scroll">
                  <SaplingTable
                    :headers="(ticketHeaders as any)"
                    :items="tickets?.data || []"
                    :search="search"
                    :page="tableOptions.page"
                    :items-per-page="tableOptions.itemsPerPage"
                    :total-items="tickets?.meta?.total || 0"
                    :is-loading="isLoading"
                    :sort-by="tableOptions.sortBy"
                    :entity-name="entityTemplates?.[0]?.name || ''"
                    :entity="entity"
                    :entity-permission="entityPermission"
                    :entity-templates="entityTemplates || []"
                    :show-actions="true"
                    table-key="ticket-table"
                    @update:search="onSearchUpdate"
                    @update:page="onPageUpdate"
                    @update:items-per-page="onItemsPerPageUpdate"
                    @update:sort-by="onSortByUpdate"
                    @edit="openEditDialog"
                    @delete="openDeleteDialog"
                    @reload="onTableOptionsUpdate"
                  />
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Personen-/Firmenliste (Filter) -->
        <v-col cols="12" md="3" class="sapling-ticket-sideboard sideboard d-flex flex-column">
          <v-card class="sapling-ticket-sideboard-card sideboard-card rounded-0 d-flex flex-column transparent" flat>
            <v-card-title class="sapling-ticket-sideboard-title text-white">
              <v-icon left>mdi-account-group</v-icon> {{ $t('navigation.person') + ' & ' + $t('navigation.company') }}
            </v-card-title>
            <v-divider></v-divider>
            <div class="sapling-ticket-sideboard-list-scroll d-flex flex-column">
              <SaplingWorkFilter
                :people="peoples?.data || []"
                :companies="companies?.data || []"
                :company-people="companyPeoples?.data || []"
                :own-person="ownPerson"
                :people-total="peoples?.meta.total || 0"
                :people-search="peopleSearch"
                :people-page="peoples?.meta.page || 1"
                :people-page-size="DEFAULT_PAGE_SIZE_SMALL"
                :companies-total="companies?.meta.total || 0"
                :companies-search="companiesSearch"
                :companies-page="companies?.meta.page || 1"
                :companies-page-size="DEFAULT_PAGE_SIZE_SMALL"
                :selectedPeople="selectedPeoples"
                :selectedCompanies="selectedCompanies"
                @togglePerson="togglePerson"
                @toggleCompany="toggleCompany"
                @searchPeople="onPeopleSearch"
                @searchCompanies="onCompaniesSearch"
                @pagePeople="onPeoplePage"
                @pageCompanies="onCompaniesPage"
              />
            </div>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script lang="ts" setup>
// #region Imports
import { ref, defineAsyncComponent } from 'vue';
import SaplingWorkFilter from '../filter/SaplingWorkFilter.vue';
import type { FormType } from '@/entity/structure';
import '@/assets/styles/SaplingTicket.css';
import { DEFAULT_PAGE_SIZE_SMALL } from '@/constants/project.constants';
import { useSaplingTicket } from '@/composables/ticket/useSaplingTicket';
// #endregion

const editDialog = ref<{ visible: boolean; mode: 'create' | 'edit'; item: FormType | null }>({ visible: false, mode: 'create', item: null });
const deleteDialog = ref<{ visible: boolean; item: FormType | null }>({ visible: false, item: null });

function openEditDialog(item: FormType) {
  editDialog.value = { visible: true, mode: 'edit', item };
}

function openDeleteDialog(item: FormType) {
  deleteDialog.value = { visible: true, item };
}
const SaplingTable = defineAsyncComponent(() => import('../table/SaplingTable.vue'));

const {
  ownPerson,
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
  search,
  onSearchUpdate,
  onPageUpdate,
  onItemsPerPageUpdate,
  onSortByUpdate,
  togglePerson,
  toggleCompany,
  onPeopleSearch,
  onCompaniesSearch,
  onPeoplePage,
  onCompaniesPage,
  onTableOptionsUpdate,
} = useSaplingTicket();
</script>