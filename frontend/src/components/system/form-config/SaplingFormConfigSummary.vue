<template>
  <div class="sapling-form-config__summary" aria-live="polite">
    <v-chip size="small" color="primary" variant="tonal" prepend-icon="mdi-form-select">
      {{ formVisibleCount }} {{ t('formConfig.formFields') }}
    </v-chip>
    <v-chip size="small" variant="outlined" prepend-icon="mdi-table">
      {{ tableVisibleCount }} {{ t('formConfig.tableFields') }}
    </v-chip>
    <v-chip size="small" variant="outlined" prepend-icon="mdi-cellphone">
      {{ mobileVisibleCount }} {{ t('formConfig.mobileFields') }}
    </v-chip>
    <v-chip size="small" variant="outlined" prepend-icon="mdi-eye-off-outline">
      {{ hiddenFieldCount }} {{ t('formConfig.hiddenFields') }}
    </v-chip>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

defineProps<{
  formVisibleCount: number
  tableVisibleCount: number
  mobileVisibleCount: number
  hiddenFieldCount: number
}>()

const { t } = useI18n()
</script>
