<template>
  <v-container
    class="sapling-login-shell sapling-access-pending d-flex flex-column justify-center align-center"
    fluid
  >
    <SaplingSurface
      :as="VCard"
      class="sapling-dialog-small sapling-access-pending__card"
      :elevation="10"
    >
      <div class="sapling-access-pending__icon">
        <v-icon color="warning" size="56">mdi-shield-lock-outline</v-icon>
      </div>

      <div class="sapling-access-pending__copy">
        <p class="sapling-access-pending__eyebrow">403</p>
        <h1 class="sapling-access-pending__title">{{ $t('exception.forbidden') }}</h1>
        <p class="sapling-access-pending__text">{{ description }}</p>
      </div>
    </SaplingSurface>
  </v-container>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { VCard } from 'vuetify/components'
import SaplingSurface from '@/components/common/SaplingSurface.vue'

const props = defineProps<{
  entityHandle?: string
}>()

const { t } = useI18n()

const description = computed(() => {
  const baseDescription = t('global.permissionDenied')
  return props.entityHandle ? `${baseDescription} (${props.entityHandle})` : baseDescription
})
</script>
