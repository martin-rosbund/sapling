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
      v-for="company in companies"
      :key="'company-' + company.handle"
      class="vertical-item compact-item"
      :class="{ 'selected': isCompanySelected(company.handle) }"
      @click="toggleCompany(company.handle)">
      <v-icon class="mr-1" size="20">mdi-domain</v-icon>
      <span class="person-name">{{ company.name }}</span>
      <v-checkbox
        :model-value="isCompanySelected(company.handle)"
        @update:model-value="checked => toggleCompany(company.handle, checked)"
        hide-details
        density="comfortable"
        class="ml-1 checkbox-no-pointer compact-checkbox"
        @click.stop
        :ripple="false"
      />
    </div>
  </div>
  <div class="section-padding-top">
    <v-pagination
      v-if="(companiesTotal ?? 0) > (companiesPageSize ?? 25)"
      :model-value="companiesPage ?? 1"
      :length="Math.ceil((companiesTotal ?? 0) / (companiesPageSize ?? 25))"
      @update:model-value="val => emit('pageCompanies', val)"
      density="compact"
      class="margin-4-0"
    />
  </div>
</template>

<script setup lang="ts">
import type { CompanyItem } from '@/entity/entity';
import { defineProps, defineEmits } from 'vue';
const props = defineProps<{ companies: CompanyItem[], companiesTotal?: number, companiesSearch?: string, companiesPage?: number, companiesPageSize: number, isCompanySelected: (id: number) => boolean }>();
const emit = defineEmits(['toggleCompany', 'searchCompanies', 'pageCompanies']);
function toggleCompany(id: number, checked?: boolean | null) {
  emit('toggleCompany', id, checked ?? undefined);
}
</script>
