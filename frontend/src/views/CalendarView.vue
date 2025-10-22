<template>
  <!-- Header -->
  <sapling-header />

  <!-- Content -->
  <sapling-calendar />

  <!-- Footer -->
  <sapling-footer />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

// Components
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingHeader from '@/components/SaplingHeader.vue';
import SaplingCalendar from '@/components/SaplingCalendar.vue';

export default defineComponent({
  name: 'CalendarView',
  components: {
    SaplingHeader,
    SaplingFooter,
    SaplingCalendar
  }
});
</script>
