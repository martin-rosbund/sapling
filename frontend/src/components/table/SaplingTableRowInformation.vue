<template>
  <v-dialog :model-value="show" max-width="680px" @update:model-value="onDialogModelValueUpdate">
    <v-card class="glass-panel pa-6" elevation="12">
      <v-card-title>{{ isLoading ? '' : $t('information.title') }}</v-card-title>
      <v-card-text>
        <template v-if="isLoading">
          <v-skeleton-loader elevation="12" type="article, actions" />
        </template>
        <template v-else>
          <v-alert
            v-if="errorMessage"
            class="mb-4"
            type="error"
            variant="tonal"
          >
            {{ errorMessage }}
          </v-alert>

          <v-textarea
            v-model="content"
            auto-grow
            rows="10"
            :counter="2048"
            :maxlength="2048"
            :label="$t('information.content')"
            :placeholder="$t('information.empty')"
            :disabled="!canEdit"
            variant="outlined"
          />

          <div class="sapling-table-row-information__hint">
            {{ $t('information.hint') }}
          </div>
        </template>
      </v-card-text>
      <template v-if="isLoading">
        <v-card-actions>
          <v-btn text prepend-icon="mdi-close" @click="$emit('close')">
            <template v-if="$vuetify.display.mdAndUp"></template>
          </v-btn>
          <v-spacer />
          <v-btn color="primary" append-icon="mdi-content-save" disabled>
            <template v-if="$vuetify.display.mdAndUp"></template>
          </v-btn>
        </v-card-actions>
      </template>
      <template v-else-if="canEdit">
        <SaplingActionSave :cancel="() => $emit('close')" :save="save" />
      </template>
      <template v-else>
        <SaplingActionClose :close="() => $emit('close')" />
      </template>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import SaplingActionClose from '@/components/actions/SaplingActionClose.vue';
import SaplingActionSave from '@/components/actions/SaplingActionSave.vue';
import {
  useSaplingTableRowInformation,
  type UseSaplingTableRowInformationEmit,
  type UseSaplingTableRowInformationProps,
} from '@/composables/table/useSaplingTableRowInformation';

const props = defineProps<UseSaplingTableRowInformationProps>();
const emit = defineEmits<UseSaplingTableRowInformationEmit>();

const {
  content,
  isLoading,
  errorMessage,
  canEdit,
  onDialogModelValueUpdate,
  save,
} = useSaplingTableRowInformation(props, emit);
</script>

<style scoped>
.sapling-table-row-information__hint {
  color: var(--sapling-text-muted);
  font-size: 0.85rem;
}
</style>