<template>
  <SaplingActionBar>
    <template #leading>
      <v-btn variant="text" prepend-icon="mdi-close" @click="cancel">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.cancel') }}</template>
      </v-btn>
    </template>

    <template #trailing>
      <v-btn color="primary" append-icon="mdi-content-save" @click="save">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.save') }}</template>
      </v-btn>
      <v-btn
        v-if="saveAndClose"
        color="primary"
        variant="tonal"
        append-icon="mdi-content-save-check"
        @click="saveAndClose"
      >
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.saveAndClose') }}</template>
      </v-btn>
    </template>
  </SaplingActionBar>
</template>

<script lang="ts" setup>
import SaplingActionBar from '@/components/actions/SaplingActionBar.vue'

defineProps<{
  cancel: () => void
  save: () => void
  saveAndClose?: () => void
}>()
</script>
