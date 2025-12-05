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
      @update:model-value="val => emit('searchCompanies', val)"
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
        class="ml-1 checkbox-no-pointer"
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
      @update:model-value="val => emit('pageCompanies', val)"
      density="compact"
      class="margin-4-0"
    />
  </div>
</template>

<script setup lang="ts">
// #region Imports
import type { CompanyItem } from '@/entity/entity';
import { useSaplingCompanyFilter } from '@/composables/filter/useSaplingCompanyFilter';
import type { PaginatedResponse } from '@/entity/structure';
// #endregion

// #region Props and Emits
const props = defineProps<{
  companies: PaginatedResponse<CompanyItem> | undefined,
  companiesSearch?: string,
  isCompanySelected: (id: number) => boolean
}>();
const emit = defineEmits(['toggleCompany', 'searchCompanies', 'pageCompanies']);
// #endregion

const {
  toggleCompany,
} = useSaplingCompanyFilter(props, emit);
</script>
