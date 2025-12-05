<template>
  <!-- Header -->
  <sapling-header />

  <!-- Content -->
  <sapling-event />

  <!-- Footer -->
  <sapling-footer />
</template>

<script lang="ts">
  //#region Imports
  import { defineComponent } from 'vue';
  import SaplingFooter from '@/components/system/SaplingFooter.vue';
  import SaplingHeader from '@/components/system/SaplingHeader.vue';
  import SaplingEvent from '@/components/event/SaplingEvent.vue';
  //#endregion
  
  //#region Components
  export default defineComponent({
    name: 'EventView',
    components: {
      SaplingHeader,
      SaplingFooter,
      SaplingEvent
    }
  });
  //#endregion
</script>
