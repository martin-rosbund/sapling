<template>
  <div class="sapling-app-layout">
    <!-- Header -->
    <sapling-header />

    <!-- Content -->
    <div class="sapling-content sapling-content--dashboard">
      <sapling-event class="flex-grow-1" />
    </div>

    <!-- Footer -->
    <sapling-footer />
  </div>
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
