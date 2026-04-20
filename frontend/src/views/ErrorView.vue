<template>
  <SaplingError />
</template>

<script lang="ts">
//#region Imports
import { defineComponent } from 'vue'
import SaplingError from '@/components/system/SaplingError.vue'
//#endregion

//#region Components
export default defineComponent({
  name: 'ErrorView',
  components: {
    SaplingError,
  },
})
//#endregion
</script>
