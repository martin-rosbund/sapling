<template>
  <v-container class="fill-height">
    <!-- Header -->
    <sapling-header />

    <!-- Content -->
    <sapling-account />
    
    <!-- Footer -->
    <sapling-footer />
  </v-container>
</template>

<script lang="ts">
  //#region Imports
  import { defineComponent } from 'vue';
  //#endregion

  //#region Components
  import SaplingFooter from '@/components/system/SaplingFooter.vue';
  import SaplingHeader from '@/components/system/SaplingHeader.vue';
  import SaplingAccount from '@/components/account/SaplingAccount.vue';

  export default defineComponent({
    name: 'LoginView',
    components: {
      SaplingHeader,
      SaplingAccount,
      SaplingFooter
    }
  });
  //#endregion
</script>