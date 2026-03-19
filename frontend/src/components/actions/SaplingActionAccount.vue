<template>
  <v-card-actions>
      <v-btn text prepend-icon="mdi-close" class="mb-2 mb-sm-0" @click="handleClose">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('global.close') }}</template>
      </v-btn>
      <v-spacer/>
      <v-btn color="primary" append-icon="mdi-lock-reset" class="ma-2" @click="handleChangePassword">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('login.changePassword') }}</template>
      </v-btn>
      <v-spacer/>
      <v-btn color="error" append-icon="mdi-logout" class="ma-2" @click="handleLogout">
        <template v-if="$vuetify.display.mdAndUp">{{ $t('login.logout') }}</template>
      </v-btn>
  </v-card-actions>
</template>

<script lang="ts" setup>
//#region Props
defineProps<{
  handleClose: () => void; // Method to handle close action
  handleChangePassword: () => void; // Method to handle password change
  handleLogout: () => void; // Method to handle logout
}>();
//#endregion
</script>