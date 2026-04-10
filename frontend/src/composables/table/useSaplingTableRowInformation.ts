import { computed, ref, watch } from 'vue';
import { i18n } from '@/i18n';
import ApiGenericService from '@/services/api.generic.service';
import { useCurrentPersonStore } from '@/stores/currentPersonStore';
import { useGenericStore } from '@/stores/genericStore';
import type { InformationItem, SaplingGenericItem } from '@/entity/entity';

export interface UseSaplingTableRowInformationProps {
  show: boolean;
  item: SaplingGenericItem | null;
  entityHandle: string;
}

export type UseSaplingTableRowInformationEmit = {
  (event: 'close'): void;
  (event: 'saved'): void;
};

export function useSaplingTableRowInformation(
  props: UseSaplingTableRowInformationProps,
  emit: UseSaplingTableRowInformationEmit,
) {
  const genericStore = useGenericStore();
  const currentPersonStore = useCurrentPersonStore();

  const content = ref('');
  const currentInformation = ref<InformationItem | null>(null);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const errorMessage = ref('');

  const referenceHandle = computed(() => {
    const handle = props.item?.handle;
    return handle == null ? '' : String(handle);
  });

  const informationState = computed(() => genericStore.getState('information'));
  const informationPermission = computed(() => informationState.value.entityPermission);

  const hasExistingRecord = computed(
    () => currentInformation.value?.handle != null,
  );
  const trimmedContent = computed(() => content.value.trim());
  const canEdit = computed(
    () =>
      Boolean(informationPermission.value?.allowInsert)
      || Boolean(informationPermission.value?.allowUpdate)
      || Boolean(informationPermission.value?.allowDelete),
  );

  const canSave = computed(() => {
    if (
      !canEdit.value
      || isLoading.value
      || isSaving.value
      || !referenceHandle.value
    ) {
      return false;
    }

    if (hasExistingRecord.value) {
      return trimmedContent.value.length > 0
        ? Boolean(informationPermission.value?.allowUpdate)
        : Boolean(informationPermission.value?.allowDelete);
    }

    return (
      trimmedContent.value.length > 0
      && Boolean(informationPermission.value?.allowInsert)
    );
  });

  watch(
    () => [props.show, referenceHandle.value, props.entityHandle] as const,
    ([show]) => {
      if (!show) {
        resetState();
        return;
      }

      void loadInformation();
    },
    { immediate: true },
  );

  function resetState() {
    content.value = '';
    currentInformation.value = null;
    isLoading.value = false;
    isSaving.value = false;
    errorMessage.value = '';
  }

  function onDialogModelValueUpdate(value: boolean) {
    if (!value) {
      resetState();
      emit('close');
    }
  }

  async function loadInformation() {
    if (!referenceHandle.value) {
      errorMessage.value = i18n.global.t('global.referenceNotFound');
      return;
    }

    isLoading.value = true;
    errorMessage.value = '';

    try {
      await genericStore.loadGeneric('information', 'global');

      const response = await ApiGenericService.find<InformationItem>('information', {
        filter: {
          entity: props.entityHandle,
          reference: referenceHandle.value,
        },
        relations: ['entity', 'person'],
        page: 1,
        limit: 1,
      });

      currentInformation.value = response.data[0] ?? null;
      content.value = currentInformation.value?.content ?? '';
    } catch (error: unknown) {
      errorMessage.value = getErrorMessage(error);
      currentInformation.value = null;
      content.value = '';
    } finally {
      isLoading.value = false;
    }
  }

  async function save() {
    if (!canSave.value) {
      return;
    }

    errorMessage.value = '';
    isSaving.value = true;

    try {
      if (hasExistingRecord.value && currentInformation.value?.handle != null) {
        if (trimmedContent.value.length === 0) {
          await ApiGenericService.delete('information', currentInformation.value.handle);
          emit('saved');
          resetState();
          emit('close');
          return;
        }

        currentInformation.value = await ApiGenericService.update<InformationItem>(
          'information',
          currentInformation.value.handle,
          { content: trimmedContent.value },
          { relations: ['entity', 'person'] },
        );
        emit('saved');
        resetState();
        emit('close');
        return;
      }

      await currentPersonStore.fetchCurrentPerson();
      const personHandle = currentPersonStore.person?.handle;
      if (personHandle == null) {
        errorMessage.value = i18n.global.t('global.entityNotFound');
        return;
      }

      await ApiGenericService.create<InformationItem>('information', {
        content: trimmedContent.value,
        entity: props.entityHandle,
        person: personHandle,
        reference: referenceHandle.value,
      });

      emit('saved');
      resetState();
      emit('close');
    } catch (error: unknown) {
      errorMessage.value = getErrorMessage(error);
    } finally {
      isSaving.value = false;
    }
  }

  function getErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const message = axiosError.response?.data?.message ?? axiosError.message;
      if (typeof message === 'string' && message.length > 0) {
        const translated = i18n.global.t(message);
        return translated !== message ? translated : message;
      }
    }

    return i18n.global.t('exception.unknownError');
  }

  return {
    content,
    isLoading,
    isSaving,
    errorMessage,
    hasExistingRecord,
    canEdit,
    canSave,
    onDialogModelValueUpdate,
    save,
  };
}