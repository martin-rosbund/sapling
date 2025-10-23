<template>
  <!-- Header -->
  <sapling-header />

  <!-- Content -->
  <sapling-right />

  <!-- Footer -->
  <sapling-footer />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

// Components
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingHeader from '@/components/SaplingHeader.vue';
import SaplingRight from '@/components/SaplingRight.vue';

export default defineComponent({
  name: 'RightView',
  components: {
    SaplingHeader,
    SaplingFooter,
    SaplingRight
  }
});
</script>