<template>
  <div class="sapling-account-dialog__footer">
    <v-card-actions class="sapling-account-dialog__actions">
      <v-btn text prepend-icon="mdi-close" @click="close">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.close') }}</template>
      </v-btn>
      <v-spacer/>
    </v-card-actions>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  close: () => void;
}>();
</script>

<style scoped src="@/assets/styles/SaplingAccountDialogs.css"></style>
