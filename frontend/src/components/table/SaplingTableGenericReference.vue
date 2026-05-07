<template>
  <div v-if="hasTarget" class="sapling-table-generic-reference">
    <v-btn
      size="small"
      :rounded="false"
      :max-height="32"
      class="glass-panel sapling-button-truncate sapling-table-generic-reference__button"
      :loading="isLoading"
      @click.stop="openTargetDialog"
    >
      <v-icon class="sapling-table-generic-reference__icon">mdi-eye</v-icon>
      <span
        v-if="displayLabel"
        class="sapling-text-truncate sapling-button-truncate__label"
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
  </div>
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
.sapling-table-generic-reference {
  display: block;
  width: min(var(--sapling-panel-width-sm), 100%);
  min-width: 0;
  max-width: var(--sapling-panel-width-sm);
  margin-right: auto;
}

.sapling-table-generic-reference__button {
  width: min(var(--sapling-panel-width-sm), 100%);
  min-width: 0;
  max-width: var(--sapling-panel-width-sm);
  justify-content: flex-start;
  text-align: left;
}

.sapling-table-generic-reference__button :deep(.v-btn__content) {
  width: 100%;
  justify-content: flex-start;
  gap: var(--sapling-space-2xs);
  overflow: hidden;
}

.sapling-table-generic-reference__icon {
  flex: 0 0 auto;
}

.sapling-table-generic-reference__button :deep(.sapling-button-truncate__label) {
  text-align: left;
}

.sapling-table-generic-reference__placeholder {
  color: rgba(255, 255, 255, 0.65);
}
</style>
