<template>
  <v-container class="fill-height">
    <!-- Content -->
    <sapling-login />
    
    <!-- Footer -->
    <sapling-footer />
  </v-container>
</template>

<script lang="ts">
  //#region Imports
  import { defineComponent } from 'vue';
  import SaplingFooter from '@/components/SaplingFooter.vue';
  import SaplingLogin from '@/components/SaplingLogin.vue';
  //#endregion

  //#region Components
  export default defineComponent({
    name: 'LoginView',
    components: {
      SaplingLogin,
      SaplingFooter
    }
  });
  //#endregion
</script>