<template>
  <v-card-actions class="d-flex justify-center">
    <v-btn v-if="props.allowCancel" color="default" prepend-icon="mdi-close" @click="props.closeDialog" class="ma-2">
      <template v-if="$vuetify.display.mdAndUp">{{ $t('global.cancel') }}</template>
    </v-btn>
    <v-spacer/>
    <v-btn color="primary" append-icon="mdi-lock-reset" @click="props.handlePasswordChange" class="ma-2">
      <template v-if="$vuetify.display.mdAndUp">{{ $t('login.changePassword') }}</template>
    </v-btn>
  </v-card-actions>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  allowCancel?: boolean;
  handlePasswordChange: () => void | Promise<void>;
  closeDialog: () => void;
}>(), {
  allowCancel: true,
});
</script>
