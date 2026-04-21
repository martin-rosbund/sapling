<template>
  <SaplingActionBar>
    <template #trailing>
      <v-btn variant="text" prepend-icon="mdi-close" @click="close">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.close') }}</template>
      </v-btn>
    </template>
  </SaplingActionBar>
</template>

<script lang="ts" setup>
import SaplingActionBar from '@/components/actions/SaplingActionBar.vue'

defineProps<{
  close: () => void
}>()
</script>
