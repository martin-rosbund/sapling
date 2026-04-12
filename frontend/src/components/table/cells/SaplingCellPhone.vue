<template>
  <v-icon start small class="mr-1 sapling-cell-phone__icon" @click.stop="openCallDialog">mdi-phone</v-icon>
  <a href="#" @click.prevent="openCallDialog">
    <slot />
  </a>
</template>

<script lang="ts" setup>
import { useSaplingPhoneDialog } from '@/composables/dialog/useSaplingPhoneDialog';
import type { SaplingGenericItem } from '@/entity/entity';

const props = defineProps<{
  value: string;
  entityHandle?: string;
  itemHandle?: string | number;
  item?: SaplingGenericItem;
}>();

const { openPhoneDialog } = useSaplingPhoneDialog();

function openCallDialog() {
  if (!props.value) {
    return;
  }

  openPhoneDialog({
    entityHandle: props.entityHandle,
    itemHandle: props.itemHandle,
    draftValues: props.item,
    phoneNumber: props.value,
  });
}
</script>

<style scoped>
.sapling-cell-phone__icon {
  cursor: pointer;
}
</style>
