<template>
  <SaplingEntityAccessGate entity-handle="salesOpportunity">
    <SaplingCrmWorkspace />
  </SaplingEntityAccessGate>
</template>

<script setup lang="ts">
import SaplingCrmWorkspace from '@/components/crm/SaplingCrmWorkspace.vue'
import SaplingEntityAccessGate from '@/components/system/SaplingEntityAccessGate.vue'
</script>
