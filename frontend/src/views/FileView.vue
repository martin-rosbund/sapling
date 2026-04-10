<template>
  <SaplingFile :entity-handle="entityHandle" />
</template>

<script lang="ts" setup>
import SaplingFile from '@/components/file/SaplingFile.vue';
import { useRoute } from 'vue-router';
import { computed } from 'vue';

const route = useRoute();
const entityHandle = computed(() => route.params.entity as string);
</script>
