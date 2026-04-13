<template>
  <v-dialog
    :model-value="isOpen"
    max-width="680px"
    @update:model-value="handleVisibilityChange"
  >
    <v-card class="glass-panel tilt-content sapling-dialog-compact-card" elevation="12">
      <div class="sapling-dialog-shell">
        <SaplingDialogHero
          :eyebrow="translate('phoneCall.title')"
          :title="dialogTitle"
          :subtitle="dialogSubtitle"
        />

        <div class="sapling-dialog-form-body">
          <v-alert
            v-if="warningMessage"
            class="mb-4"
            type="info"
            variant="tonal"
          >
            {{ warningMessage }}
          </v-alert>

          <v-alert
            v-if="errorMessage"
            class="mb-4"
            type="error"
            variant="tonal"
          >
            {{ errorMessage }}
          </v-alert>

          <v-text-field
            :model-value="phoneNumber"
            :label="translate('phoneCall.phoneNumber')"
            prepend-inner-icon="mdi-phone"
            readonly
            hide-details="auto"
          />

          <v-textarea
            v-model="note"
            class="mt-4"
            auto-grow
            rows="6"
            :counter="2048"
            :maxlength="2048"
            :label="translate('phoneCall.note')"
            variant="outlined"
          />

          <v-checkbox
            v-model="reached"
            class="mt-2"
            :label="translate('phoneCall.reached')"
            hide-details
          />
        </div>

        <v-divider class="my-2"></v-divider>

        <v-card-actions>
          <v-btn text prepend-icon="mdi-close" @click="closePhoneDialog">
            <template v-if="$vuetify.display.mdAndUp">{{ translate('global.close') }}</template>
          </v-btn>
          <v-spacer />
          <v-btn
            color="primary"
            variant="tonal"
            prepend-icon="mdi-phone"
            :disabled="!canCall"
            @click="startCall"
          >
            <template v-if="$vuetify.display.mdAndUp">{{ translate('phoneCall.call') }}</template>
          </v-btn>
          <v-btn
            color="primary"
            prepend-icon="mdi-content-save"
            :loading="isSaving"
            :disabled="!canSave"
            @click="savePhoneCall"
          >
            <template v-if="$vuetify.display.mdAndUp">{{ translate('global.save') }}</template>
          </v-btn>
        </v-card-actions>
      </div>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import SaplingDialogHero from '@/components/common/SaplingDialogHero.vue';
import { useSaplingPhoneDialog } from '@/composables/dialog/useSaplingPhoneDialog';
import { useSaplingPhoneNumber } from '@/composables/phone/useSaplingPhoneNumber';
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader';
import type { PhoneCallItem } from '@/entity/entity';
import ApiGenericService from '@/services/api.generic.service';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';

const { t, te } = useI18n();
const { isOpen, context, closePhoneDialog } = useSaplingPhoneDialog();
const currentPersonStore = useCurrentPersonStore();
const {
  isLoading: isTranslationLoading,
  loadTranslations,
} = useTranslationLoader('global', 'navigation', 'phoneCall');
const { formatPhoneNumber } = useSaplingPhoneNumber();

const note = ref('');
const reached = ref(false);
const errorMessage = ref('');
const isSaving = ref(false);

const phoneNumber = computed(() => formatPhoneNumber(context.value?.phoneNumber ?? ''));
const hasPhoneNumber = computed(() => phoneNumber.value.length > 0);
const hasSavedRecord = computed(() => context.value?.itemHandle != null);
const hasEntityContext = computed(
  () => typeof context.value?.entityHandle === 'string' && context.value.entityHandle.length > 0,
);
const canCall = computed(() => hasPhoneNumber.value);
const canSave = computed(
  () => hasPhoneNumber.value && hasSavedRecord.value && hasEntityContext.value && !isSaving.value,
);

const dialogTitle = computed(() => phoneNumber.value || translate('phoneCall.call'));
const dialogSubtitle = computed(() => {
  const entityHandle = context.value?.entityHandle;
  const itemHandle = context.value?.itemHandle;
  if (!entityHandle) {
    return '';
  }

  const entityLabel = translateIfExists(`navigation.${entityHandle}`, entityHandle);
  return itemHandle == null ? entityLabel : `${entityLabel} #${String(itemHandle)}`;
});

const warningMessage = computed(() => {
  if (!hasPhoneNumber.value) {
    return translate('phoneCall.phoneNumberRequired');
  }

  if (!hasSavedRecord.value || !hasEntityContext.value) {
    return translate('phoneCall.requiresSavedRecord');
  }

  return '';
});

watch(
  () => isOpen.value,
  async (open) => {
    if (open) {
      await Promise.all([
        loadTranslations(),
        currentPersonStore.fetchCurrentPerson(),
      ]);
      return;
    }

    note.value = '';
    reached.value = false;
    errorMessage.value = '';
    isSaving.value = false;
  },
  { immediate: true },
);

function translate(key: string) {
  return isTranslationLoading.value ? '' : t(key);
}

function translateIfExists(key: string, fallback: string) {
  if (isTranslationLoading.value) {
    return fallback;
  }

  return te(key) ? t(key) : fallback;
}

watch(
  () => isOpen.value,
  (open) => {
    if (!open) {
      return;
    }

    errorMessage.value = '';
  },
);

function handleVisibilityChange(value: boolean) {
  if (!value) {
    closePhoneDialog();
  }
}

async function startCall() {
  if (!canCall.value) {
    return;
  }

  errorMessage.value = '';
  window.open(`tel:${phoneNumber.value}`, '_self');
}

async function savePhoneCall() {
  if (!canSave.value || !context.value?.entityHandle || context.value.itemHandle == null) {
    return;
  }

  errorMessage.value = '';
  isSaving.value = true;

  try {
    await currentPersonStore.fetchCurrentPerson();

    const personHandle = currentPersonStore.person?.handle;
    if (personHandle == null) {
      errorMessage.value = translate('global.entityNotFound');
      return;
    }

    await ApiGenericService.create<PhoneCallItem>('phoneCall', {
      phoneNumber: phoneNumber.value,
      note: note.value.trim() || null,
      reached: reached.value,
      entity: context.value.entityHandle,
      reference: String(context.value.itemHandle),
      person: personHandle,
    });

    closePhoneDialog();
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const message = axiosError.response?.data?.message ?? axiosError.message;
      if (typeof message === 'string' && message.length > 0) {
        const translated = translate(message);
        errorMessage.value = translated !== message ? translated : message;
      } else {
        errorMessage.value = translate('exception.unknownError');
      }
    } else {
      errorMessage.value = translate('exception.unknownError');
    }
  } finally {
    isSaving.value = false;
  }
}
</script>

<style scoped src="@/assets/styles/SaplingAccountDialogs.css"></style>