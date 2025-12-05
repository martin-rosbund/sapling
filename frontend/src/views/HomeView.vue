<template>
    <!-- Header -->
  <sapling-header />

    <!-- Content -->
  <sapling-dashboard />
  
    <!-- Footer -->
  <sapling-footer />
</template>

<script lang="ts">
  //#region Imports
  import { defineComponent } from 'vue';
  import SaplingDashboard from '@/components/dashboard/SaplingDashboard.vue';
  import SaplingHeader from '@/components/system/SaplingHeader.vue';
  import SaplingFooter from '@/components/system/SaplingFooter.vue';
  //#endregion
  
  //#region Components
  export default defineComponent({
    name: 'HomeView',
    components: {
      SaplingDashboard, 
      SaplingHeader, 
      SaplingFooter
    },
  });
  //#endregion
</script>
