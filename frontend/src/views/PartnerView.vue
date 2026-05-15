<template>
  <SaplingEntityAccessGate :entity-handle="entityHandle">
    <SaplingPartner :entity-handle="entityHandle" />
  </SaplingEntityAccessGate>
</template>

<script lang="ts" setup>
import SaplingPartner from '@/components/partner/SaplingPartner.vue'
import SaplingEntityAccessGate from '@/components/system/SaplingEntityAccessGate.vue'
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const entityHandle = computed(() => route.params.entity as string)
</script>
