<template>
  <!-- Header -->
  <sapling-header />

  <!-- Content -->
  <sapling-system />
  
  <!-- Footer -->
  <sapling-footer />
</template>

<script lang="ts">
  //#region Imports
  import { defineComponent } from 'vue';
  //#endregion

  //#region Components
  import SaplingFooter from '@/components/system/SaplingFooter.vue';
  import SaplingHeader from '@/components/system/SaplingHeader.vue';
  import SaplingSystem from '@/components/system/SaplingSystem.vue';

  export default defineComponent({
    name: 'SystemView',
    components: {
      SaplingHeader,
      SaplingSystem,
      SaplingFooter
    }
  });
  //#endregion
</script>