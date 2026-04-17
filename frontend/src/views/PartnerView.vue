<template>
  <SaplingPartner :entity-handle="entityHandle" />
</template>

<script lang="ts" setup>
import SaplingPartner from '@/components/partner/SaplingPartner.vue'
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const entityHandle = computed(() => route.params.entity as string)
</script>
