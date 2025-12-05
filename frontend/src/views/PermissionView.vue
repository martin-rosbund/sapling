<template>
  <v-container class="fill-height d-flex flex-column pa-0" fluid>
    <!-- Header -->
    <sapling-header />

    <!-- Content -->
    <sapling-permission/>

    <!-- Footer -->
    <sapling-footer />
  </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import SaplingFooter from '@/components/system/SaplingFooter.vue';
import SaplingHeader from '@/components/system/SaplingHeader.vue';
import SaplingPermission from '@/components/account/SaplingPermission.vue';

export default defineComponent({
  name: 'RightView',
  components: {
    SaplingHeader,
    SaplingFooter,
    SaplingPermission
  }
});
</script>