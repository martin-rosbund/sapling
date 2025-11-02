import { ref, watch, onMounted } from 'vue';
import { BACKEND_URL } from '@/constants/project.constants';
import type { EntityGroupItem, EntityItem } from '@/entity/entity';
import type { AccumulatedPermission } from '@/entity/structure';
import { i18n } from '@/i18n';
import ApiGenericService from '@/services/api.generic.service';
import TranslationService from '@/services/translation.service';
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore';

export function useSaplingNavigation(props: { modelValue: boolean }, emit: (event: 'update:modelValue', value: boolean) => void) {
  const translationService = ref(new TranslationService());
  const isLoading = ref(true);
  const groups = ref<EntityGroupItem[]>([]);
  const entities = ref<EntityItem[]>([]);
  const ownPermission = ref<AccumulatedPermission[] | null>(null);
  const drawer = ref(props.modelValue);

  onMounted(async () => {
    await setOwnPermissions();
    await loadTranslation();
    await fetchGroupsAndEntities();
  });

  watch(() => props.modelValue, val => drawer.value = val);
  watch(drawer, val => emit('update:modelValue', val));
  watch(() => i18n.global.locale.value, async () => {
    await loadTranslation();
  });

  async function setOwnPermissions() {
    const currentPermissionStore = useCurrentPermissionStore();
    await currentPermissionStore.fetchCurrentPermission();
    ownPermission.value = currentPermissionStore.accumulatedPermission;
  }

  async function loadTranslation() {
    isLoading.value = true;
    await translationService.value.prepare('navigation', 'navigationGroup');
    isLoading.value = false;
  }

  async function fetchGroupsAndEntities() {
    entities.value = (await ApiGenericService.find<EntityItem>('entity', { filter: { canShow: true } })).data;
    if (ownPermission.value) {
      entities.value = entities.value.filter(entity => {
        return ownPermission.value?.some(permission => permission.entityName === entity.handle && permission.allowShow);
      });
    }
    groups.value = (await ApiGenericService.find<EntityGroupItem>('entityGroup')).data;
    if (ownPermission.value) {
      const allowedGroupHandles = new Set(
        entities.value.map(entity => entity.group)
      );
      groups.value = groups.value.filter(group => allowedGroupHandles.has(group.handle));
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
    ownPermission,
    drawer,
    getEntitiesByGroup,
    openSwagger,
  };
}
