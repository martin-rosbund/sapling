<template>
  <v-icon start small class="mr-1 sapling-cell-mail__icon" @click.stop="openCompose"
    >mdi-email</v-icon
  >
  <a href="#" @click.prevent="openCompose">
    <slot />
  </a>
</template>

<script lang="ts" setup>
import { useSaplingMailDialog } from '@/composables/dialog/useSaplingMailDialog'
import type { SaplingGenericItem } from '@/entity/entity'

const props = defineProps<{
  value: string
  entityHandle: string
  itemHandle?: string | number
  item?: SaplingGenericItem
}>()

const { openMailDialog } = useSaplingMailDialog()

function openCompose() {
  openMailDialog({
    entityHandle: props.entityHandle,
    itemHandle: props.itemHandle,
    draftValues: props.item,
    initialTo: props.value ? [props.value] : [],
  })
}
</script>
