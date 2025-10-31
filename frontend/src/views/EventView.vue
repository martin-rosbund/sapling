<template>
  <!-- Header -->
  <sapling-header />

  <!-- Content -->
  <sapling-event />

  <!-- Footer -->
  <sapling-footer />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

// Components
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingHeader from '@/components/SaplingHeader.vue';
import SaplingEvent from '@/components/SaplingEvent.vue';

export default defineComponent({
  name: 'EventView',
  components: {
    SaplingHeader,
    SaplingFooter,
    SaplingEvent
  }
});
</script>
