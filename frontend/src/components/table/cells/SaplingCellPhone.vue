<template>
  <v-icon start small class="mr-1 sapling-cell-phone__icon" @click.stop="openCallDialog">mdi-phone</v-icon>
  <a href="#" @click.prevent="openCallDialog">
    <slot />
  </a>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useSaplingPhoneDialog } from '@/composables/dialog/useSaplingPhoneDialog';
import { useSaplingPhoneNumber } from '@/composables/phone/useSaplingPhoneNumber';
import type { SaplingGenericItem } from '@/entity/entity';

const props = defineProps<{
  value: string;
  entityHandle?: string;
  itemHandle?: string | number;
  item?: SaplingGenericItem;
}>();

const { openPhoneDialog } = useSaplingPhoneDialog();
const { formatPhoneNumber } = useSaplingPhoneNumber();
const formattedPhoneNumber = computed(() => formatPhoneNumber(props.value));

function openCallDialog() {
  if (!formattedPhoneNumber.value) {
    return;
  }

  openPhoneDialog({
    entityHandle: props.entityHandle,
    itemHandle: props.itemHandle,
    draftValues: props.item,
    phoneNumber: formattedPhoneNumber.value,
  });
}
</script>

<style scoped>
.sapling-cell-phone__icon {
  cursor: pointer;
}
</style>
