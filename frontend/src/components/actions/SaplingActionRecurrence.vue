<template>
  <SaplingActionBar>
    <template #leading>
      <v-btn variant="text" prepend-icon="mdi-close" @click="cancel">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.cancel') }}</template>
      </v-btn>
    </template>

    <template #trailing>
      <v-btn variant="text" prepend-icon="mdi-restore" @click="reset">
        <template v-if="$vuetify.display.mdAndUp">{{ resetLabel }}</template>
      </v-btn>
      <v-btn color="primary" append-icon="mdi-content-save" @click="save">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.save') }}</template>
      </v-btn>
    </template>
  </SaplingActionBar>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SaplingActionBar from '@/components/actions/SaplingActionBar.vue'

const props = defineProps<{
  cancel: () => void
  save: () => void
  reset: () => void
}>()

const { t, te, locale } = useI18n()

const resetLabel = computed(() => {
  if (te('filter.reset')) {
    return t('filter.reset')
  }

  return String(locale.value).toLowerCase().startsWith('de') ? 'Zuruecksetzen' : 'Reset'
})

void props
</script>
