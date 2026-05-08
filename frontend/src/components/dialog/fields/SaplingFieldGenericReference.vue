<template>
  <div class="sapling-field-generic-reference">
    <div class="sapling-field-generic-reference__label">
      {{ label }}
    </div>
    <div class="sapling-field-generic-reference__actions">
      <v-btn
        class="glass-panel sapling-field-generic-reference__target"
        :disabled="!hasTarget"
        :loading="isLoading"
        @click.stop="openTargetDialog"
      >
        <v-icon class="pr-3" left>mdi-eye</v-icon>
        <span v-if="displayLabel" class="sapling-inline-pre">
          {{ displayLabel }}
        </span>
      </v-btn>
      <v-btn
        icon="mdi-timeline-outline"
        variant="text"
        :disabled="!hasTarget"
        @click.stop="openTimeline"
      />
    </div>
    <div v-if="targetEntityLabel" class="sapling-field-generic-reference__hint">
      {{ targetEntityLabel }}
    </div>

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
</template>

<script lang="ts" setup>
import { ref, toRef } from 'vue'
import type { EntityTemplate } from '@/entity/structure'
import type { SaplingGenericItem } from '@/entity/entity'
import SaplingDialogEdit from '@/components/dialog/SaplingDialogEdit.vue'
import { useSaplingGenericReferenceTarget } from '@/composables/reference/useSaplingGenericReferenceTarget'
import { useTimelineDialogStore } from '@/stores/timelineDialogStore'

const props = defineProps<{
  item: SaplingGenericItem
  template: EntityTemplate
  label: string
}>()

const dialogOpen = ref(false)
const timelineDialogStore = useTimelineDialogStore()

const {
  displayLabel,
  ensureTargetResolved,
  hasTarget,
  isLoading,
  resolvedItem,
  targetEntity,
  targetEntityHandle,
  targetHandle,
  targetTemplates,
  targetEntityLabel,
} = useSaplingGenericReferenceTarget({
  item: toRef(props, 'item'),
  template: toRef(props, 'template'),
})

async function openTargetDialog() {
  const targetRecord = await ensureTargetResolved()
  if (!targetRecord || !targetEntity.value) {
    return
  }

  dialogOpen.value = true
}

function openTimeline() {
  if (!targetEntityHandle.value || targetHandle.value == null || targetHandle.value === '') {
    return
  }

  timelineDialogStore.openTimeline(targetEntityHandle.value, String(targetHandle.value))
}
</script>

<style scoped>
.sapling-field-generic-reference {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.25rem;
}

.sapling-field-generic-reference__label {
  font-size: 0.95rem;
  font-weight: 600;
}

.sapling-field-generic-reference__actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.sapling-field-generic-reference__target {
  justify-content: flex-start;
  flex: 1 1 auto;
  min-height: 40px;
}

.sapling-field-generic-reference__hint {
  font-size: 0.8rem;
  opacity: 0.72;
}
</style>
