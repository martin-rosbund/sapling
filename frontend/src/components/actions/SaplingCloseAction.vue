<template>
  <v-card-actions>
    <v-btn text @click="close">{{ $t('global.close') }}</v-btn>
    <v-spacer/>
  </v-card-actions>
</template>

<script lang="ts" setup>
defineProps<{
  close: () => void;
}>();
</script>
