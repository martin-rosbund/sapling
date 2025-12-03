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
  import SaplingDashboard from '@/components/SaplingDashboard.vue';
  import SaplingHeader from '@/components/SaplingHeader.vue';
  import SaplingFooter from '@/components/SaplingFooter.vue';
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
