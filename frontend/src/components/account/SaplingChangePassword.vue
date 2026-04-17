<!-- Dialog for changing the user password -->
<template>
  <v-dialog :model-value="props.modelValue" max-width="600" persistent>
    <v-snackbar-queue color="error" v-model="messages"></v-snackbar-queue>
    <v-card
      v-tilt="TILT_DEFAULT_OPTIONS"
      class="glass-panel tilt-content sapling-change-password-dialog"
      max-width="600"
      elevation="10"
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
            />
            <v-text-field
              v-model="confirmPassword"
              :label="$t('login.confirmPassword')"
              prepend-icon="mdi-lock-check"
              type="password"
            />
          </v-form>
        </template>

        <template #actions>
          <div v-if="isLoading" class="sapling-dialog__footer">
            <v-card-actions class="sapling-dialog__actions d-flex justify-center">
              <v-btn
                v-if="props.allowCancel"
                color="default"
                prepend-icon="mdi-close"
                @click="closeDialog"
                class="ma-2"
              >
                <template v-if="$vuetify.display.mdAndUp"></template>
              </v-btn>
              <v-spacer />
              <v-btn color="primary" append-icon="mdi-lock-reset" disabled class="ma-2">
                <template v-if="$vuetify.display.mdAndUp"></template>
              </v-btn>
            </v-card-actions>
          </div>

          <SaplingActionChangePassword
            v-else
            :allowCancel="props.allowCancel"
            :handlePasswordChange="handlePasswordChange"
            :closeDialog="closeDialog"
          />
        </template>
      </SaplingDialogShell>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
// #region Imports
import { useSaplingChangePassword } from '@/composables/account/useSaplingChangePassword'
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants'
import SaplingActionChangePassword from '../actions/SaplingActionChangePassword.vue'
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

const { newPassword, confirmPassword, isLoading, messages, handlePasswordChange, closeDialog } =
  useSaplingChangePassword({
    close: () => emit('update:modelValue', false),
    onCancel: () => emit('cancel'),
    onSuccess: () => emit('success'),
  })
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingAccountDialogs.css"></style>
