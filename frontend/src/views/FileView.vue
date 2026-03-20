<template>
  <div class="sapling-fileview-fullheight">
    <!-- Header -->
    <sapling-header />

    <!-- Content -->
    <div class="sapling-fileview-content">
      <sapling-file :entity-handle="entityHandle" />
    </div>

    <!-- Footer -->
    <sapling-footer />
  </div>
</template>
<style scoped>
.sapling-fileview-fullheight {
  height: 100vh;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.sapling-fileview-content {
  height: calc(100dvh - 230px);
  min-height: calc(100dvh - 230px);
  display: flex;
  flex-direction: column;
}
</style>

<script lang="ts" setup>
import SaplingFooter from '@/components/system/SaplingFooter.vue';
import SaplingHeader from '@/components/system/SaplingHeader.vue';
import SaplingFile from '@/components/file/SaplingFile.vue';
import { useRoute } from 'vue-router';
import { computed } from 'vue';

const route = useRoute();
const entityHandle = computed(() => route.params.entity as string);
</script>
