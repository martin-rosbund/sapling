import { ref, watch, onMounted } from 'vue';
import type { EntityGroupItem, EntityItem } from '@/entity/entity';
import type { AccumulatedPermission } from '@/entity/structure';
import ApiGenericService from '@/services/api.generic.service';
import { useCurrentPermissionStore } from '@/stores/currentPermissionStore';
import { useTranslationLoader } from '@/composables/generic/useTranslationLoader';

export function useSaplingNavigation(props: { modelValue: boolean }, emit: (event: 'update:modelValue', value: boolean) => void) {
  //#region State
  // Load translations for the navigation module
  const { translationService, isLoading, loadTranslations } = useTranslationLoader('navigation', 'navigationGroup');

  // Reactive property for storing groups of entities
  const groups = ref<EntityGroupItem[]>([]);

  // Reactive property for storing entities
  const entities = ref<EntityItem[]>([]);

  // Reactive property for storing permissions for entities
  const entitiesPermissions = ref<AccumulatedPermission[] | null>(null);

  // Reactive property for managing the state of the navigation drawer
  const drawer = ref(props.modelValue);
  //#endregion

  //#region Lifecycle Hooks
  // Lifecycle hook: Called when the component is mounted
  onMounted(async () => {
    await setEntitiesPermissions(); // Fetch and set permissions for entities
    await loadTranslations(); // Load translations for navigation
    await fetchGroupsAndEntities(); // Fetch groups and entities
  });

  // Watcher: Sync the drawer state with the parent component
  watch(() => props.modelValue, val => drawer.value = val);

  // Watcher: Emit the updated drawer state to the parent component
  watch(drawer, val => emit('update:modelValue', val));
  //#endregion

  //#region Methods
  // Function to fetch and set permissions for entities
  async function setEntitiesPermissions() {
    const currentPermissionStore = useCurrentPermissionStore(); // Access the current permission store
    await currentPermissionStore.fetchCurrentPermission(); // Fetch current permissions
    entitiesPermissions.value = currentPermissionStore.accumulatedPermission; // Set the permissions
  }

  // Function to fetch groups and entities
  async function fetchGroupsAndEntities() {
    // Fetch entities with a filter to show only allowed ones
    entities.value = (await ApiGenericService.find<EntityItem>('entity', { filter: { canShow: true } })).data;

    // Filter entities based on permissions
    if (entitiesPermissions.value) {
      entities.value = entities.value.filter(entity => {
        return entitiesPermissions.value?.some(x => x.entityName === entity.handle && x.allowShow);
      });
    }

    // Fetch groups of entities
    groups.value = (await ApiGenericService.find<EntityGroupItem>('entityGroup')).data;

    // Filter groups based on allowed entities
    if (entitiesPermissions.value) {
      const allowedGroupHandles = new Set(
        entities.value.map(entity => entity.group)
      );
      groups.value = groups.value.filter(x => allowedGroupHandles.has(x.handle));
    }
  }

  // Function to get entities by their group handle
  function getEntitiesByGroup(groupHandle: string) {
    return entities.value.filter(e => e.group === groupHandle);
  }
  //#endregion

  //#region Return
  // Return all reactive properties and methods for use in components
  return {
    translationService,
    isLoading,
    groups,
    entities,
    entitiesPermissions,
    drawer,
    getEntitiesByGroup,
  };
  //#endregion
}
