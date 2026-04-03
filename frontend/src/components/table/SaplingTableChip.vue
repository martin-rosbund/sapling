<template>
  <div>
    <v-chip v-if="showChip" :color="chipColor" size="small">
      <v-icon v-if="hasChipIcon" size="small" class="mr-2">
        {{ chipIcon }}
      </v-icon>
      {{ chipLabel }}
    </v-chip>
    <v-skeleton-loader v-else-if="isLoading" type="chip" />
  </div>
</template>

<script lang="ts" setup>
import {
  useSaplingTableChip,
  type UseSaplingTableChipProps,
} from '@/composables/table/useSaplingTableChip';

const props = defineProps<UseSaplingTableChipProps>();

const {
  chipColor,
  chipIcon,
  chipLabel,
  hasChipIcon,
  showChip,
  isLoading,
} = useSaplingTableChip(props);
</script>
