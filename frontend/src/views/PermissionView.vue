<template>
  <SaplingPermission />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import SaplingPermission from '@/components/account/SaplingPermission.vue';

export default defineComponent({
  name: 'RightView',
  components: {
    SaplingPermission
  }
});
</script>