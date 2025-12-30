<template>
  <v-container class="fill-height">
    <!-- Content -->
    <sapling-login />
    
    <!-- Footer -->
    <sapling-footer-login />
  </v-container>
</template>

<script lang="ts">
  //#region Imports
  import { defineComponent } from 'vue';
  import SaplingLogin from '@/components/account/SaplingLogin.vue';
  import SaplingFooterLogin from '@/components/system/SaplingFooterLogin.vue';
  //#endregion

  //#region Components
  export default defineComponent({
    name: 'LoginView',
    components: {
      SaplingLogin,
      SaplingFooterLogin
    }
  });
  //#endregion
</script>