<template>
  <v-dialog
    :model-value="show"
    :max-width="SAPLING_DIALOG_MAX_WIDTH.lg"
    @update:model-value="onDialogModelValueUpdate"
  >
    <SaplingDialogCard class="sapling-dialog-compact-card" :close="() => emit('close')">
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

            <SaplingMarkdownField
              v-model="content"
              :label="$t('information.content')"
              :rows="10"
              :disabled="!canEdit"
            />

            <div class="sapling-table-row-information__hint">
              {{ $t('information.hint') }}
            </div>
          </div>
        </template>

        <template v-if="isLoading">
          <SaplingActionBarSkeleton />
        </template>
        <template v-else-if="canEdit">
          <SaplingActionSave :cancel="() => $emit('close')" :save="save" />
        </template>
        <template v-else>
          <SaplingActionClose :close="() => $emit('close')" />
        </template>
      </div>
    </SaplingDialogCard>
  </v-dialog>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import SaplingActionClose from '@/components/actions/SaplingActionClose.vue'
import SaplingActionSave from '@/components/actions/SaplingActionSave.vue'
import SaplingActionBarSkeleton from '@/components/actions/SaplingActionBarSkeleton.vue'
import SaplingDialogCard from '@/components/dialog/SaplingDialogCard.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import SaplingMarkdownField from '@/components/dialog/fields/SaplingFieldMarkdown.vue'
import { SAPLING_DIALOG_MAX_WIDTH } from '@/constants/dialog.constants'
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
