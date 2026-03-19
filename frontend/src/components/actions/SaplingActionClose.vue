<template>
  <v-card-actions>
    <v-btn text prepend-icon="mdi-close" @click="close">
      <template v-if="$vuetify.display.mdAndUp">{{ $t('global.close') }}</template>
    </v-btn>
    <v-spacer/>
  </v-card-actions>
</template>

<script lang="ts" setup>
defineProps<{
  close: () => void;
}>();
</script>
