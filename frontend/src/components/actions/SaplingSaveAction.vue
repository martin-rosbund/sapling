<template>
  <v-card-actions>
    <v-btn text prepend-icon="mdi-close" @click="cancel">
      <template v-if="$vuetify.display.mdAndUp">{{ $t('global.cancel') }}</template>
    </v-btn>
    <v-spacer/>
    <v-btn color="primary" append-icon="mdi-content-save" @click="save">
      <template v-if="$vuetify.display.mdAndUp">{{ $t('global.save') }}</template>
    </v-btn>
  </v-card-actions>
</template>

<script lang="ts" setup>
defineProps<{
  cancel: () => void;
  save: () => void;
}>();
</script>
ncu