<template>
  <div class="section-padding-bottom">
    <v-text-field
      :model-value="companiesSearch ?? ''"
      :label="$t ? $t('global.search') : 'Suchen'"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      hide-details
      single-line
      density="compact"
      class="margin-bottom-4"
      @update:model-value="onCompaniesSearch"
    />
  </div>
  <div>
    <div
      v-for="company in companies?.data"
      :key="'company-' + company.handle"
      class="sapling-vertical-item"
      :class="{ 'selected': isCompanySelected(company.handle) }"
      @click="toggleCompany(company.handle)">
      <v-icon class="mr-1" size="20">mdi-domain</v-icon>
      <span class="sapling-person-name">{{ company.name }}</span>
      <v-checkbox
        :model-value="isCompanySelected(company.handle)"
        @update:model-value="checked => toggleCompany(company.handle, checked)"
        hide-details
        density="comfortable"
        class="sapling-filter-checkbox checkbox-no-pointer"
        @click.stop
        :ripple="false"
      />
    </div>
  </div>
  <div class="section-padding-top">
    <v-pagination
      v-if="(companies?.meta.total ?? 0) > (companies?.meta.limit ?? 0)"
      :model-value="companies?.meta.page ?? 1"
      :length="Math.ceil((companies?.meta.total ?? 0) / (companies?.meta.limit ?? 25))"
      @update:model-value="onCompaniesPage"
      density="compact"
      class="margin-4-0"
    />
  </div>
</template>

<script setup lang="ts">
// #region Imports
import {
  useSaplingFilterCompany,
  type UseSaplingFilterCompanyEmit,
  type UseSaplingFilterCompanyProps,
} from '@/composables/filter/useSaplingFilterCompany';
// #endregion

// #region Props and Emits
const props = defineProps<UseSaplingFilterCompanyProps>();
const emit = defineEmits<UseSaplingFilterCompanyEmit>();
// #endregion

const {
  companies,
  companiesSearch,
  isCompanySelected,
  toggleCompany,
  onCompaniesSearch,
  onCompaniesPage,
} = useSaplingFilterCompany(props, emit);
</script>
