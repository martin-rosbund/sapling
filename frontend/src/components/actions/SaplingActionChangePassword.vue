<template>
  <div class="sapling-account-dialog__footer">
    <v-card-actions class="sapling-account-dialog__actions d-flex justify-center">
      <v-btn v-if="props.allowCancel" color="default" prepend-icon="mdi-close" @click="props.closeDialog" class="ma-2">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.cancel') }}</template>
      </v-btn>
      <v-spacer/>
      <v-btn color="primary" append-icon="mdi-lock-reset" @click="props.handlePasswordChange" class="ma-2">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('login.changePassword') }}</template>
      </v-btn>
    </v-card-actions>
  </div>
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

<style scoped src="@/assets/styles/SaplingAccountDialogs.css"></style>
