import { defineStore } from 'pinia';
import { ref } from 'vue';
import ApiService from '@/services/api.service';
import type { AccumulatedPermission } from '@/entity/structure';

export const useCurrentPermissionStore = defineStore('currentPermission', () => {
  const accumulatedPermission = ref<AccumulatedPermission[] | null>([]);
  const loading = ref(false);
  const loaded = ref(false);
  let fetchPromise: Promise<void> | null = null;

  async function fetchCurrentPermission(force = false): Promise<void> {
    if (loaded.value && accumulatedPermission.value && !force) return;
    if (loading.value && fetchPromise) {
      await fetchPromise;
      return;
    }
    loading.value = true;
    fetchPromise = (async () => {
      try {
        accumulatedPermission.value = await ApiService.findOne<AccumulatedPermission[]>('current/permission');
        loaded.value = true;
      } catch {
        accumulatedPermission.value = null;
        loaded.value = false;
      } finally {
        loading.value = false;
        fetchPromise = null;
      }
    })();
    await fetchPromise;
  }

  return {
    accumulatedPermission,
    loading,
    loaded,
    fetchCurrentPermission,
  };
});
