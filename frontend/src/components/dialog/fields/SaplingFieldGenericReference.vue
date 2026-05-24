<template>
  <div class="sapling-field-generic-reference">
    <div class="sapling-field-generic-reference__label">
      {{ label }}
    </div>
    <div class="sapling-field-generic-reference__actions">
      <v-btn
        class="glass-panel sapling-field-generic-reference__target"
        :disabled="!hasTarget"
        prepend-icon="mdi-eye"
        :loading="isLoading"
        :text="displayLabel"
        @click.stop="openTargetDialog"
      >
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
import '@/assets/styles/components/SaplingFieldControls.css'
import { toRef } from 'vue'
import type { EntityTemplate } from '@/entity/structure'
import type { SaplingGenericItem } from '@/entity/entity'
import SaplingDialogEdit from '@/components/dialog/SaplingDialogEdit.vue'
import { useSaplingGenericReferenceDialog } from '@/composables/reference/useSaplingGenericReferenceDialog'
import { useSaplingGenericReferenceTarget } from '@/composables/reference/useSaplingGenericReferenceTarget'
import { useTimelineDialogStore } from '@/stores/timelineDialogStore'

const props = defineProps<{
  item: SaplingGenericItem
  template: EntityTemplate
  label: string
}>()

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

const { dialogOpen, openTargetDialog } = useSaplingGenericReferenceDialog({
  ensureTargetResolved,
  targetEntity,
})

function openTimeline() {
  if (!targetEntityHandle.value || targetHandle.value == null || targetHandle.value === '') {
    return
  }

  timelineDialogStore.openTimeline(targetEntityHandle.value, String(targetHandle.value))
}
</script>
