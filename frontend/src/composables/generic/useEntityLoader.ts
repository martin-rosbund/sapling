import { ref, onMounted, watch } from 'vue';
import ApiGenericService from '@/services/api.generic.service';

export function useEntityLoader(entityType: string, options: { filter?: any; limit?: number; page?: number } = {}) {
  const entity = ref<any | null>(null);
  const isLoading = ref(true);

  async function loadEntity() {
    isLoading.value = true;
    const response = await ApiGenericService.find<any>(entityType, options);
    entity.value = response.data[0] || null;
    isLoading.value = false;
  }

  onMounted(loadEntity);
  watch(() => options.filter, loadEntity, { deep: true });

  return {
    entity,
    isLoading,
    loadEntity,
  };
}
