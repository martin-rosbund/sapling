<template>
  <v-dialog :model-value="show" max-width="680px" @update:model-value="onDialogModelValueUpdate">
    <v-card
      class="glass-panel tilt-content sapling-dialog-compact-card"
      v-tilt="TILT_DEFAULT_OPTIONS"
      elevation="12"
    >
      <div class="sapling-dialog-shell">
        <template v-if="isLoading">
          <SaplingDialogHero loading :loading-stats-count="2" />

          <div class="sapling-dialog-form-body">
            <v-skeleton-loader elevation="12" type="article, actions" />
          </div>
        </template>

        <template v-else>
          <SaplingDialogHero
            :eyebrow="$t('information.title')"
            :title="$t('information.title')"
            :subtitle="informationSubtitle"
          />

          <div class="sapling-dialog-form-body">
            <v-alert v-if="errorMessage" class="mb-4" type="error" variant="tonal">
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
          </div>
        </template>

        <template v-if="isLoading">
          <div class="sapling-dialog__footer">
            <v-card-actions class="sapling-dialog__actions">
              <v-btn text prepend-icon="mdi-close" @click="$emit('close')">
                <template v-if="$vuetify.display.mdAndUp"></template>
              </v-btn>
              <v-spacer />
              <v-btn color="primary" append-icon="mdi-content-save" disabled>
                <template v-if="$vuetify.display.mdAndUp"></template>
              </v-btn>
            </v-card-actions>
          </div>
        </template>
        <template v-else-if="canEdit">
          <SaplingActionSave :cancel="() => $emit('close')" :save="save" />
        </template>
        <template v-else>
          <SaplingActionClose :close="() => $emit('close')" />
        </template>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants'
import SaplingActionClose from '@/components/actions/SaplingActionClose.vue'
import SaplingActionSave from '@/components/actions/SaplingActionSave.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import {
  useSaplingTableRowInformation,
  type UseSaplingTableRowInformationEmit,
  type UseSaplingTableRowInformationProps,
} from '@/composables/table/useSaplingTableRowInformation'

const props = defineProps<UseSaplingTableRowInformationProps>()
const emit = defineEmits<UseSaplingTableRowInformationEmit>()
const { t, te } = useI18n()

const { content, isLoading, errorMessage, canEdit, onDialogModelValueUpdate, save } =
  useSaplingTableRowInformation(props, emit)

const entityLabel = computed(() => {
  const key = `navigation.${props.entityHandle}`
  return te(key) ? t(key) : props.entityHandle
})

const informationSubtitle = computed(() => {
  const handle = props.item?.handle
  return handle == null ? entityLabel.value : `${entityLabel.value} #${String(handle)}`
})
</script>

<style scoped src="@/assets/styles/SaplingAccountDialogs.css"></style>
<style scoped>
.sapling-table-row-information__hint {
  color: var(--sapling-text-muted);
  font-size: 0.85rem;
}
</style>
