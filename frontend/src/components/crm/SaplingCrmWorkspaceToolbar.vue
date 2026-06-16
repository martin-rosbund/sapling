<template>
  <section class="sapling-crm-workspace__toolbar glass-panel">
    <v-btn-toggle
      v-model="activeCockpit"
      class="sapling-crm-workspace__tabs"
      color="primary"
      density="comfortable"
      divided
      mandatory
    >
      <v-btn value="sales" prepend-icon="mdi-chart-timeline-variant">
        {{ t('crmWorkspace.salesCockpit') }}
      </v-btn>
      <v-btn value="account" prepend-icon="mdi-domain">
        {{ t('crmWorkspace.accountCockpit') }}
      </v-btn>
      <v-btn value="customerSuccess" prepend-icon="mdi-heart-pulse">
        {{ t('crmWorkspace.customerSuccessCockpit') }}
      </v-btn>
    </v-btn-toggle>

    <div class="sapling-crm-workspace__toolbar-fields">
      <v-text-field
        v-model="search"
        density="comfortable"
        hide-details
        clearable
        autocomplete="off"
        prepend-inner-icon="mdi-magnify"
        :label="t('global.search')"
      />
      <v-autocomplete
        v-model="selectedResponsibleHandle"
        density="comfortable"
        hide-details
        clearable
        prepend-inner-icon="mdi-account-tie-outline"
        :items="responsiblePersonOptions"
        :label="t('crmWorkspace.responsiblePerson')"
      />
      <v-select
        v-model="contactThresholdDays"
        density="comfortable"
        hide-details
        :items="contactThresholdOptions"
        :label="t('crmWorkspace.contactThreshold')"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

export type CrmCockpitKey = 'sales' | 'account' | 'customerSuccess'

type SelectOption<T> = {
  title: string
  value: T
}

defineProps<{
  responsiblePersonOptions: SelectOption<string>[]
  contactThresholdOptions: SelectOption<number>[]
}>()

const activeCockpit = defineModel<CrmCockpitKey>('activeCockpit', { required: true })
const search = defineModel<string>('search', { required: true })
const selectedResponsibleHandle = defineModel<string | null>('selectedResponsibleHandle', {
  required: true,
})
const contactThresholdDays = defineModel<number>('contactThresholdDays', { required: true })

const { t } = useI18n()
</script>
