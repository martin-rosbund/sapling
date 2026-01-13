<template>
  <v-card-actions>
    <div
      class="d-flex w-100 align-center"
      :class="$vuetify.display.xs ? 'flex-column' : 'flex-row justify-end'"
    >
      <v-btn text class="mb-2 mb-sm-0" @click="handleClose">{{ $t('global.close') }}</v-btn>
      <v-spacer v-if="!$vuetify.display.xs"></v-spacer>
      <v-btn color="primary" class="ma-2" @click="handleChangePassword">{{ $t('login.changePassword') }}</v-btn>
      <v-btn color="error" class="ma-2" @click="handleLogout">{{ $t('login.logout') }}</v-btn>
    </div>
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