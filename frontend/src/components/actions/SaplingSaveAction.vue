<template>
  <v-card-actions>
    <v-btn text @click="cancel">{{ $t('global.cancel') }}</v-btn>
    <v-spacer></v-spacer>
    <v-btn color="primary" @click="save">{{ $t('global.save') }}</v-btn>
  </v-card-actions>
</template>

<script lang="ts" setup>
defineProps<{
  cancel: () => void;
  save: () => void;
}>();
</script>
