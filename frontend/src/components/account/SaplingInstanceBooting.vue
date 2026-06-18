<template>
  <div class="d-flex flex-column align-center justify-center py-12 ma-12">
    <v-icon size="64" color="primary" class="mb-4">mdi-rocket-launch</v-icon>
    <v-progress-linear indeterminate color="primary" height="6" class="mb-4" />
    <template v-if="hasBootingTranslations">
      <div class="text-h6 text-center font-weight-bold mb-2">
        {{ t('login.instanceBootingTitle') }}
      </div>
      <div class="text-caption text-center text-grey-darken-1">
        {{ t('login.instanceBootingDescription') }}
      </div>
    </template>
    <template v-else>
      <v-skeleton-loader class="sapling-instance-booting__skeleton mb-2" type="heading" />
      <v-skeleton-loader class="sapling-instance-booting__skeleton" type="text" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, te } = useI18n()

const hasBootingTranslations = computed(
  () => te('login.instanceBootingTitle') && te('login.instanceBootingDescription'),
)
</script>

<style scoped>
.sapling-instance-booting__skeleton {
  width: min(280px, 80vw);
}
</style>
