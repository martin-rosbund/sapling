<template>
  <SaplingEntityAccessGate entity-handle="salesOpportunity">
    <SaplingSalesPipelineBoard />
  </SaplingEntityAccessGate>
</template>

<script lang="ts" setup>
import SaplingEntityAccessGate from '@/components/system/SaplingEntityAccessGate.vue'
import SaplingSalesPipelineBoard from '@/components/sales/SaplingSalesPipelineBoard.vue'
</script>
