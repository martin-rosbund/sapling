<template>
  <SaplingDashboard />
</template>

<script lang="ts">
  //#region Imports
  import { defineComponent } from 'vue';
  import SaplingDashboard from '@/components/dashboard/SaplingDashboard.vue';
  //#endregion
  
  //#region Components
  export default defineComponent({
    name: 'HomeView',
    components: {
      SaplingDashboard,
    },
  });
  //#endregion
</script>
