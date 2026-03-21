import { computed, ref } from 'vue';
import { useGenericStore } from '@/stores/genericStore';

export function useSaplingFileHeader() {
  // #region Entity Loader
  const genericStore = useGenericStore();
  genericStore.loadGeneric('document', 'global');
  const entity = computed(() => genericStore.getState('document').entity);
  const entityPermission = computed(() => genericStore.getState('document').entityPermission);
  const entityTemplates = computed(() => genericStore.getState('document').entityTemplates);
  const isLoading = computed(() => genericStore.getState('document').isLoading);
  // #endregion

  return {
    entity,
    entityPermission,
    entityTemplates,
    isLoading,
  };
}
