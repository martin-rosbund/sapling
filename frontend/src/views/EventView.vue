<template>
  <SaplingEvent />
</template>

<script lang="ts">
//#region Imports
import { defineComponent } from 'vue'
import SaplingEvent from '@/components/event/SaplingEvent.vue'
//#endregion

//#region Components
export default defineComponent({
  name: 'EventView',
  components: {
    SaplingEvent,
  },
})
//#endregion
</script>
