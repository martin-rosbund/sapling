<template>
  <template v-if="hasTarget">
    <v-btn
      size="small"
      :rounded="false"
      :max-height="32"
      class="glass-panel sapling-button-truncate"
      :loading="isLoading"
      @click.stop="openTargetDialog"
    >
      <v-icon class="pr-3" left>mdi-eye</v-icon>
      <span
        v-if="displayLabel"
        class="sapling-inline-pre sapling-text-truncate sapling-button-truncate__label"
      >
        {{ displayLabel }}
      </span>
    </v-btn>
    <SaplingDialogEdit
      v-if="dialogOpen && resolvedItem && targetEntity"
      :model-value="dialogOpen"
      mode="readonly"
      :item="resolvedItem"
      :entity="targetEntity"
      :templates="targetTemplates"
      @update:model-value="dialogOpen = false"
    />
  </template>
  <span v-else class="sapling-table-generic-reference__placeholder">-</span>
</template>

<script lang="ts" setup>
import { ref, toRef } from 'vue'
import type { SaplingGenericItem } from '@/entity/entity'
import type { EntityTemplate } from '@/entity/structure'
import SaplingDialogEdit from '@/components/dialog/SaplingDialogEdit.vue'
import { useSaplingGenericReferenceTarget } from '@/composables/reference/useSaplingGenericReferenceTarget'

const props = defineProps<{
  item: SaplingGenericItem
  col: EntityTemplate
}>()

const dialogOpen = ref(false)

const {
  displayLabel,
  ensureTargetResolved,
  hasTarget,
  isLoading,
  resolvedItem,
  targetEntity,
  targetTemplates,
} = useSaplingGenericReferenceTarget({
  item: toRef(props, 'item'),
  template: toRef(props, 'col'),
})

async function openTargetDialog() {
  const targetRecord = await ensureTargetResolved()
  if (!targetRecord || !targetEntity.value) {
    return
  }

  dialogOpen.value = true
}
</script>

<style scoped>
.sapling-table-generic-reference__placeholder {
  color: rgba(255, 255, 255, 0.65);
}
</style>
