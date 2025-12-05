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
                    :items="items"
                    :search="search ?? ''"
                    :page="page"
                    :items-per-page="itemsPerPage"
                    :total-items="totalItems"
                    :is-loading="isLoading"
                    :sort-by="sortBy"
                    :entity-name="entity?.handle || ''"
                    :entity="entity"
                    :entity-permission="entityPermission"
                    :entity-templates="entityTemplates || []"
                    :show-actions="true"
                    :parent-filter="parentFilter"
                    table-key="ticket-table"
                    @update:search="onSearchUpdate"
                    @update:page="onPageUpdate"
                    @update:items-per-page="onItemsPerPageUpdate"
                    @update:sort-by="onSortByUpdate"
                    @reload="loadData"
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
              <SaplingWorkFilter @update:selectedPeoples="onSelectedPeoplesUpdate" />
            </div>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script lang="ts" setup>
// #region Imports
import { defineAsyncComponent, ref } from 'vue';
import SaplingWorkFilter from '@/components/filter/SaplingWorkFilter.vue';
import '@/assets/styles/SaplingTicket.css';
import { useSaplingTable } from '@/composables/table/useSaplingTable';
import { useSaplingTicket } from '@/composables/ticket/useSaplingTicket';
// #endregion

const SaplingTable = defineAsyncComponent(() => import('@/components/table/SaplingTable.vue'));

// #region Composable
const {
  items,
  search,
  page,
  itemsPerPage,
  totalItems,
  isLoading,
  sortBy,
  entityTemplates,
  entity,
  entityPermission,
  onSearchUpdate,
  onPageUpdate,
  onItemsPerPageUpdate,
  onSortByUpdate,
  loadData,
  parentFilter
} = useSaplingTable(ref('ticket'));

const { onSelectedPeoplesUpdate } = useSaplingTicket(parentFilter);
// #endregion
</script>