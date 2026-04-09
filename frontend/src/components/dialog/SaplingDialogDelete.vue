<template>
  <!-- Confirmation dialog for deleting an entity record -->
  <v-dialog
    :model-value="modelValue"
    @update:model-value="handleDialogUpdate"
    class="sapling-dialog-medium"
    persistent
  >
    <v-card class="glass-panel tilt-content sapling-dialog-delete-card" v-tilt="TILT_DEFAULT_OPTIONS" elevation="12">
      <div class="sapling-dialog-shell">
        <section class="sapling-dialog-hero sapling-dialog-hero--danger">
          <div class="sapling-dialog-hero__copy">
            <div class="sapling-dialog-hero__eyebrow">{{ $t('global.confirmDelete') }}</div>
            <div class="sapling-dialog-hero__title-row">
              <h2 class="sapling-dialog-hero__title">{{ $t('global.confirmDelete') }}</h2>
            </div>
            <p class="sapling-dialog-hero__subtitle">{{ $t('global.confirmDeleteQuestion') }}</p>
          </div>
        </section>



        <v-divider class="my-2"></v-divider>
        <SaplingActionDelete
          :handleCancel="handleCancel"
          :handleConfirm="handleConfirm"
        />
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
// #region Imports
import { computed } from 'vue';
import { useSaplingDialogDelete } from '@/composables/dialog/useSaplingDialogDelete';
import SaplingActionDelete from '@/components/actions/SaplingActionDelete.vue';
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants';
// #endregion

// #region Props & Emits
const props = defineProps<{
  modelValue: boolean;
  item: unknown | null;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
  (event: 'confirm'): void;
  (event: 'cancel'): void;
}>();
// #endregion

// #region Composable
const {
  handleDialogUpdate,
  handleCancel,
  handleConfirm,
} = useSaplingDialogDelete(emit);

const itemLabel = computed(() => {
  if (!props.item || typeof props.item !== 'object') {
    return '-';
  }

  const itemRecord = props.item as Record<string, unknown>;
  const candidateKeys = ['title', 'name', 'handle', 'id'];

  for (const candidateKey of candidateKeys) {
    const value = itemRecord[candidateKey];

    if (typeof value === 'string' && value.trim()) {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'bigint') {
      return String(value);
    }
  }

  return '-';
});
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingAccountDialogs.css"></style>
