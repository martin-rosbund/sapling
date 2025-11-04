import { ref, onMounted, watch } from 'vue';
import ApiGenericService from '@/services/api.generic.service';
import type { AccumulatedPermission, EntityTemplate } from '@/entity/structure';
import type { EntityItem } from '@/entity/entity';
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore';
import TranslationService from '@/services/translation.service';
import { i18n } from '@/i18n';
import ApiService from '@/services/api.service';

export function useGenericLoader(entityName: string, ...namespaces: string[]) {
  const entity = ref<EntityItem | null>(null);
  const entityPermission = ref<AccumulatedPermission | null>(null);
  const entityTranslation = ref(new TranslationService());
  const entityTemplates = ref<EntityTemplate[]>([]);
  const isLoading = ref(true);
  let currentEntityName = entityName;
  let currentNamespaces = namespaces;

  async function loadGeneric(entityName: string, ...namespaces: string[]) {  
    currentEntityName = entityName;
    currentNamespaces = namespaces;
    isLoading.value = true;
    await loadEntity();
    await loadTemplates();
    await loadPermissions();
    await loadTranslations();
  }

  async function loadEntity() {
    const response = await ApiGenericService.find<EntityItem>('entity', { filter: { handle: currentEntityName }, limit: 1, page: 1 });
    entity.value = response.data[0] || null;
  }

  async function loadPermissions() {
    const currentPermissionStore = useCurrentPermissionStore();
    await currentPermissionStore.fetchCurrentPermission();
    entityPermission.value = currentPermissionStore.accumulatedPermission?.find(x => x.entityName === currentEntityName) || null;
  }

  async function loadTemplates() {
    entityTemplates.value = await ApiService.findAll<EntityTemplate[]>(`template/${currentEntityName}`);
  }

  async function loadTranslations() {
    isLoading.value = true;
    await entityTranslation.value.prepare(...currentNamespaces, currentEntityName, ...getUniqueTemplateReferenceNames());
    isLoading.value = false;
  }

  function getUniqueTemplateReferenceNames(): string[] {
    return Array.from(new Set(entityTemplates.value.map(x => x.referenceName)));
  }

  onMounted(() => loadGeneric(currentEntityName, ...currentNamespaces));
  watch(() => i18n.global.locale.value, loadTranslations);

  return {
    entity,
    entityPermission,
    entityTranslation,
    entityTemplates,
    isLoading,
    loadGeneric,
  };
}
