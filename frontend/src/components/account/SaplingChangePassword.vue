<!-- Dialog for changing the user password -->
<template>
  <v-dialog
    :model-value="props.modelValue"
    :max-width="SAPLING_DIALOG_MAX_WIDTH.sm"
    persistent
    @keydown.esc="onEscape"
  >
    <SaplingDialogCard
      class="sapling-change-password-dialog"
      :max-width="SAPLING_DIALOG_MAX_WIDTH.sm"
      :elevation="10"
    >
      <SaplingDialogShell body-class="sapling-change-password-dialog__body">
        <template #hero>
          <SaplingDialogHero v-if="isLoading" loading :loading-stats-count="2" />
          <SaplingDialogHero
            v-else
            :eyebrow="$t('login.account')"
            :title="$t('login.changePasswordTitle')"
          />
        </template>

        <template #body>
          <v-skeleton-loader v-if="isLoading" elevation="12" type="article" />

          <v-form
            v-else
            class="sapling-change-password-form"
            @submit.prevent="handlePasswordChange"
          >
            <v-text-field
              v-model="newPassword"
              :label="$t('login.newPassword')"
              prepend-icon="mdi-lock"
              type="password"
              autocomplete="off"
            />
            <v-text-field
              v-model="confirmPassword"
              :label="$t('login.confirmPassword')"
              prepend-icon="mdi-lock-check"
              type="password"
              autocomplete="off"
            />
          </v-form>
        </template>

        <template #actions>
          <SaplingActionBarSkeleton v-if="isLoading" />

          <SaplingActionChangePassword
            v-else
            :allowCancel="props.allowCancel"
            :handlePasswordChange="handlePasswordChange"
            :closeDialog="closeDialog"
          />
        </template>
      </SaplingDialogShell>
    </SaplingDialogCard>
  </v-dialog>
</template>

<script setup lang="ts">
// #region Imports
import { useSaplingChangePassword } from '@/composables/account/useSaplingChangePassword'
import { SAPLING_DIALOG_MAX_WIDTH } from '@/constants/dialog.constants'
import SaplingActionChangePassword from '../actions/SaplingActionChangePassword.vue'
import SaplingActionBarSkeleton from '@/components/actions/SaplingActionBarSkeleton.vue'
import SaplingDialogCard from '@/components/dialog/SaplingDialogCard.vue'
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue'
import SaplingDialogShell from '@/components/common/SaplingDialogShell.vue'
// #endregion

// #region Props & Composable
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    allowCancel?: boolean
  }>(),
  {
    allowCancel: true,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'cancel'): void
  (event: 'success'): void
}>()

const { newPassword, confirmPassword, isLoading, handlePasswordChange, closeDialog } =
  useSaplingChangePassword({
    close: () => emit('update:modelValue', false),
    onCancel: () => emit('cancel'),
    onSuccess: () => emit('success'),
  })

function onEscape(): void {
  if (props.allowCancel) {
    closeDialog()
  }
}
// #endregion
</script>
