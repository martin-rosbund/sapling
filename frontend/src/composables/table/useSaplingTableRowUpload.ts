import { computed, ref } from 'vue';
import ApiService from '@/services/api.service';
import { useGenericStore } from '@/stores/genericStore';

export function useSaplingTableRowUpload(entityHandle: string, itemHandle: string) {
  const file = ref<File | null>(null);
  const description = ref('');
  const isUploading = ref(false);
  const formRef = ref();

  // #region Entity Loader
  const genericStore = useGenericStore();
  genericStore.loadGeneric('document', 'global');
  const entity = computed(() => genericStore.getState('document').entity);
  const entityPermission = computed(() => genericStore.getState('document').entityPermission);
  const entityTemplates = computed(() => genericStore.getState('document').entityTemplates);
  const isLoading = computed(() => genericStore.getState('document').isLoading);
  // #endregion

  async function upload() {
    if (!file.value) return;
    isUploading.value = true;
    try {
      const formData = new FormData();
      formData.append('file', file.value);
      formData.append('typeHandle', 'document');
      formData.append('description', description.value);
      await ApiService.uploadDocument(entityHandle, itemHandle, formData);
      return true;
    } catch {
      isUploading.value = false;
      return false;
    }
  }

  return {
    file,
    description,
    isUploading,
    formRef,
    entity,
    entityPermission,
    entityTemplates,
    isLoading,
    upload,
  };
}
