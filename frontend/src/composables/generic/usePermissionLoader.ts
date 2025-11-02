import { ref, onMounted, watch } from 'vue';
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore';
import { i18n } from '@/i18n';

export function usePermissionLoader(entityName: string) {
  const ownPermission = ref<import('@/entity/structure').AccumulatedPermission | null>(null);
  const isLoading = ref(true);

  async function loadPermission() {
    isLoading.value = true;
    const currentPermissionStore = useCurrentPermissionStore();
    await currentPermissionStore.fetchCurrentPermission();
    ownPermission.value = currentPermissionStore.accumulatedPermission?.find(x => x.entityName === entityName) || null;
    isLoading.value = false;
  }

  onMounted(loadPermission);
  watch(() => i18n.global.locale.value, loadPermission);
  watch(() => entityName, loadPermission);

  return { ownPermission, isLoading, loadPermission };
}
