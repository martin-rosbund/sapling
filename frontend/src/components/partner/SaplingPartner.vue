<template>
  <v-container class="sapling-partner-container pa-0 pr-1" density="compact" fluid>
    <v-skeleton-loader
      v-if="isLoading"
      elevation="12"
      class="fill-height glass-panel"
      type="article, actions, table"/>
    <template v-else>
      <v-row class="sapling-partner-row fill-height pr-8" density="compact">
        <!-- Ticketliste -->
        <v-col cols="12" md="12" class="sapling-partner-main-table-col d-flex flex-column">
          <v-card flat class="sapling-partner-main-table-card rounded-0 d-flex flex-column">
            <v-card-text class="sapling-partner-table-text pa-0 flex-grow-1">
              <div class="sapling-partner-table-scroll">
                  <SaplingTable
                    :items="items"
                    :search="search ?? ''"
                    :page="page"
                    :items-per-page="itemsPerPage"
                    :total-items="totalItems"
                    :is-loading="isLoading"
                    :sort-by="sortBy"
                    :column-filters="columnFilters"
                    :active-filter="activeFilter"
                    :entity-handle="entity?.handle || ''"
                    :entity="entity"
                    :entity-permission="entityPermission"
                    :entity-templates="entityTemplates || []"
                    :show-actions="true"
                    :multi-select="true"
                    :parent-filter="parentFilter"
                    :table-key="entityHandleRef + '-table'"
                    @update:search="onSearchUpdate"
                    @update:page="onPageUpdate"
                    @update:items-per-page="onItemsPerPageUpdate"
                    @update:sort-by="onSortByUpdate"
                    @update:column-filters="onColumnFiltersUpdate"
                  />
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
      <!-- Personen-/Firmenliste (Filter) Drawer -->
      <SaplingFilterWork @update:selectedPeoples="onSelectedPeoplesUpdate" />
    </template>
  </v-container>
</template>

<script lang="ts" setup>
// #region Imports
import { defineAsyncComponent, ref } from 'vue';
import { useSaplingFilterWork } from '@/composables/filter/useSaplingFilterWork';
import SaplingFilterWork from '@/components/filter/SaplingFilterWork.vue';
import { useSaplingTable } from '@/composables/table/useSaplingTable';
import { useSaplingPartner } from '@/composables/partner/useSaplingPartner';
// #endregion

const SaplingTable = defineAsyncComponent(() => import('@/components/table/SaplingTable.vue'));

// #region Props
const props = defineProps<{ entityHandle: string }>();

// #region Composable

const { selectedPeoples, ownPerson } = useSaplingFilterWork();
const entityHandleRef = ref(props.entityHandle);

const {
  items,
  search,
  page,
  itemsPerPage,
  totalItems,
  isLoading,
  sortBy,
  columnFilters,
  activeFilter,
  entityTemplates,
  entity,
  entityPermission,
  onSearchUpdate,
  onPageUpdate,
  onItemsPerPageUpdate,
  onColumnFiltersUpdate,
  onSortByUpdate,
  parentFilter,
  generateHeaders,
  initialSort,
} = useSaplingTable(entityHandleRef);

const { onSelectedPeoplesUpdate } = useSaplingPartner(
  parentFilter,
  entityTemplates
);

import { watch } from 'vue';
import { useGenericStore } from '@/stores/genericStore';

const genericStore = useGenericStore();

watch(
  () => props.entityHandle,
  async (newEntityName) => {
    entityHandleRef.value = newEntityName;
    sortBy.value = [];

    genericStore.loadGeneric(entityHandleRef.value, 'global').then(() => {
      generateHeaders();
      initialSort();
    });

    selectedPeoples.value = ownPerson.value && ownPerson.value.handle ? [ownPerson.value.handle] : [];
    onSelectedPeoplesUpdate(selectedPeoples.value ? [...selectedPeoples.value.toString()] : []);
  }
);

</script>

<style scoped src="@/assets/styles/SaplingPartner.css"></style>
