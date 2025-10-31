<template>
  <!-- Header -->
  <sapling-header />

  <!-- Content -->
  <sapling-permission />

  <!-- Footer -->
  <sapling-footer />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

// Components
import SaplingFooter from '@/components/SaplingFooter.vue';
import SaplingHeader from '@/components/SaplingHeader.vue';
import SaplingPermission from '@/components/SaplingPermission.vue';

export default defineComponent({
  name: 'RightView',
  components: {
    SaplingHeader,
    SaplingFooter,
    SaplingPermission
  }
});
</script>