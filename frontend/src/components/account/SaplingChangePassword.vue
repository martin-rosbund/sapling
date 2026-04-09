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
      <div class="sapling-dialog-shell">
        <template v-if="isLoading">
          <section class="sapling-dialog-hero">
            <div class="sapling-dialog-hero__copy sapling-dialog-hero__loading-copy">
              <v-skeleton-loader type="heading, text" />
            </div>

            <div class="sapling-dialog-hero__stats">
              <v-skeleton-loader
                v-for="item in 2"
                :key="item"
                class="sapling-dialog-hero__loading-stat"
                type="article"
              />
            </div>
          </section>

          <div class="sapling-change-password-dialog__body">
            <v-skeleton-loader elevation="12" type="article" />
          </div>
        </template>

        <template v-else>
          <section class="sapling-dialog-hero">
            <div class="sapling-dialog-hero__copy">
              <div class="sapling-dialog-hero__eyebrow">{{ $t('login.account') }}</div>
              <div class="sapling-dialog-hero__title-row">
                <h2 class="sapling-dialog-hero__title">{{ $t('login.changePasswordTitle') }}</h2>
              </div>
            </div>
          </section>

          <div class="sapling-change-password-dialog__body">
            <v-form class="sapling-change-password-form" @submit.prevent="handlePasswordChange">
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
          </div>
        </template>

        <v-divider class="my-2"></v-divider>

        <template v-if="isLoading">
          <v-card-actions class="d-flex justify-center">
            <v-btn v-if="props.allowCancel" color="default" prepend-icon="mdi-close" @click="closeDialog" class="ma-2">
              <template v-if="$vuetify.display.mdAndUp"></template>
            </v-btn>
            <v-spacer/>
            <v-btn color="primary" append-icon="mdi-lock-reset" disabled class="ma-2">
              <template v-if="$vuetify.display.mdAndUp"></template>
            </v-btn>
          </v-card-actions>
        </template>
        <template v-else>
          <SaplingActionChangePassword
            :allowCancel="props.allowCancel"
            :handlePasswordChange="handlePasswordChange"
            :closeDialog="closeDialog"
          />
        </template>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
// #region Imports
import { computed } from 'vue';
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

const newPasswordLength = computed(() => newPassword.value.length);
const confirmPasswordLength = computed(() => confirmPassword.value.length);
// #endregion
</script>

<style scoped src="@/assets/styles/SaplingAccountDialogs.css"></style>
