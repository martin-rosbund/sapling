<template>
  <SaplingSystem />
</template>

<script lang="ts">
  //#region Imports
  import { defineComponent } from 'vue';
  //#endregion

  //#region Components
  import SaplingSystem from '@/components/system/SaplingSystem.vue';

  export default defineComponent({
    name: 'SystemView',
    components: {
      SaplingSystem,
    }
  });
  //#endregion
</script>