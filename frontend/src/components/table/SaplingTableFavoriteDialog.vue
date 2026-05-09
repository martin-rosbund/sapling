<template>
  <v-dialog
    :model-value="modelValue"
    :max-width="SAPLING_DIALOG_MAX_WIDTH.sm"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <SaplingDialogCard class="sapling-dialog-compact-card">
      <div class="sapling-dialog-shell">
        <SaplingDialogHero
          :eyebrow="$t('global.add')"
          :title="$t('navigation.favorite')"
          :subtitle="title || $t('favorite.title')"
        />

        <div class="sapling-dialog-form-body">
          <v-form ref="favoriteFormRef" class="sapling-dialog-form">
            <v-text-field
              :model-value="title"
              :label="$t('favorite.title') + '*'"
              :rules="titleRules"
              required
              @update:model-value="emit('update:title', String($event ?? ''))"
            />
          </v-form>
        </div>

        <SaplingActionSave :cancel="onCancel" :save="onSave" />
      </div>
    </SaplingDialogCard>
  </v-dialog>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SaplingActionSave from '@/components/actions/SaplingActionSave.vue'
import SaplingDialogCard from '@/components/dialog/SaplingDialogCard.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import { SAPLING_DIALOG_MAX_WIDTH } from '@/constants/dialog.constants'

type FavoriteFormRef = {
  validate?: () => Promise<boolean | { valid: boolean }>
}

defineProps<{
  modelValue: boolean
  title: string
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'update:title', value: string): void
  (event: 'save'): void
  (event: 'cancel'): void
}>()

const { t } = useI18n()
const favoriteFormRef = ref<FavoriteFormRef | null>(null)

const titleRules = computed(() => [
  (value: unknown) =>
    !!String(value ?? '').trim() || `${t('favorite.title')} ${t('global.isRequired')}`,
])

async function onSave() {
  const validationResult = await favoriteFormRef.value?.validate?.()
  const isValid =
    typeof validationResult === 'boolean' ? validationResult : (validationResult?.valid ?? true)

  if (!isValid) {
    return
  }

  emit('save')
}

function onCancel() {
  emit('cancel')
}
</script>
