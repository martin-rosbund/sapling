<!-- Dialog for changing the user password -->
<template>
  <v-dialog :model-value="props.modelValue" max-width="600" persistent>
    <v-snackbar-queue color="error" v-model="messages"></v-snackbar-queue>
    <v-card v-tilt="TILT_DEFAULT_OPTIONS" class="pa-6 glass-panel tilt-content" max-width="600" elevation="10">
      <v-skeleton-loader
        v-if="isLoading"
        class="mx-auto sapling-skeleton-fullheight"
        elevation="12"
        type="article, actions"
      />
      <template v-else>
        <v-card-title class="text-h5 text-center">
          {{ $t('login.changePasswordTitle') }}
        </v-card-title>

        <v-card-text>
          <v-form @submit.prevent="handlePasswordChange">
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
        </v-card-text>

        <v-divider class="my-4"></v-divider>

        <SaplingActionChangePassword
          :allowCancel="props.allowCancel"
          :handlePasswordChange="handlePasswordChange"
          :closeDialog="closeDialog"
        />
      </template>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
// #region Imports
import { useSaplingChangePassword } from '@/composables/account/useSaplingChangePassword';
import { TILT_DEFAULT_OPTIONS } from '@/constants/tilt.constants';
import SaplingActionChangePassword from '../actions/SaplingActionChangePassword.vue';
// #endregion

// #region Props & Composable
const props = withDefaults(defineProps<{
  modelValue: boolean;
  allowCancel?: boolean;
}>(), {
  allowCancel: true,
});

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
  (event: 'cancel'): void;
  (event: 'success'): void;
}>();

const {
  newPassword,
  confirmPassword,
  isLoading,
  messages,
  handlePasswordChange,
  closeDialog,
} = useSaplingChangePassword({
  close: () => emit('update:modelValue', false),
  onCancel: () => emit('cancel'),
  onSuccess: () => emit('success'),
});
// #endregion
</script>
