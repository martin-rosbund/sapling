import { ref, watch, onMounted } from 'vue';
import { BACKEND_URL } from '@/constants/project.constants';
import type { EntityGroupItem, EntityItem } from '@/entity/entity';
import type { AccumulatedPermission } from '@/entity/structure';
import ApiGenericService from '@/services/api.generic.service';
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore';
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader';

export function useSaplingNavigation(props: { modelValue: boolean }, emit: (event: 'update:modelValue', value: boolean) => void) {
  const { translationService, isLoading, loadTranslations } = useTranslationLoader('navigation', 'navigationGroup');
  const groups = ref<EntityGroupItem[]>([]);
  const entities = ref<EntityItem[]>([]);
  const entitiesPermissions = ref<AccumulatedPermission[] | null>(null);
  const drawer = ref(props.modelValue);

  onMounted(async () => {
    await setEntitiesPermissions();
    await loadTranslations();
    await fetchGroupsAndEntities();
  });

  watch(() => props.modelValue, val => drawer.value = val);
  watch(drawer, val => emit('update:modelValue', val));

  async function setEntitiesPermissions() {
    const currentPermissionStore = useCurrentPermissionStore();
    await currentPermissionStore.fetchCurrentPermission();
    entitiesPermissions.value = currentPermissionStore.accumulatedPermission;
  }



  async function fetchGroupsAndEntities() {
    entities.value = (await ApiGenericService.find<EntityItem>('entity', { filter: { canShow: true } })).data;
    if (entitiesPermissions.value) {
      entities.value = entities.value.filter(entity => {
        return entitiesPermissions.value?.some(x => x.entityName === entity.handle && x.allowShow);
      });
    }
    groups.value = (await ApiGenericService.find<EntityGroupItem>('entityGroup')).data;
    if (entitiesPermissions.value) {
      const allowedGroupHandles = new Set(
        entities.value.map(entity => entity.group)
      );
      groups.value = groups.value.filter(x => allowedGroupHandles.has(x.handle));
    }
  }

  function getEntitiesByGroup(groupHandle: string) {
    return entities.value.filter(e => e.group === groupHandle);
  }

  const swagger = BACKEND_URL + 'swagger';
  function openSwagger() {
    window.open(swagger, '_blank');
  }

  return {
    translationService,
    isLoading,
    groups,
    entities,
    entitiesPermissions,
    drawer,
    getEntitiesByGroup,
    openSwagger,
  };
}
