<template>
  <SaplingActionBar>
    <template #leading>
      <v-btn variant="text" prepend-icon="mdi-close" @click="close">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.cancel') }}</template>
      </v-btn>
    </template>

    <template #trailing>
      <v-btn variant="text" prepend-icon="mdi-download" :disabled="empty" @click="exportMessages">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.download') }}</template>
      </v-btn>
      <v-btn color="error" append-icon="mdi-delete" :disabled="empty" @click="clearAll">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.clearAll') }}</template>
      </v-btn>
    </template>
  </SaplingActionBar>
</template>

<script lang="ts" setup>
import SaplingActionBar from '@/components/actions/SaplingActionBar.vue'

// #region Props
defineProps<{
  close: () => void
  exportMessages: () => void
  clearAll: () => void
  empty?: boolean
}>()
// #endregion
</script>
