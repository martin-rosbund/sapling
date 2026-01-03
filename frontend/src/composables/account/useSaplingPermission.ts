import { ref, onMounted, reactive, computed, watch } from 'vue'; // Import Vue utilities for reactivity and lifecycle hooks
import ApiGenericService from '../../services/api.generic.service'; // Import the generic API service for backend communication
import type { PersonItem, RoleItem, EntityItem, RoleStageItem, PermissionItem } from '../../entity/entity'; // Import types for type safety
import { useGenericStore } from '@/stores/genericStore'; // Import the generic store composable
import type { PaginatedResponse } from '@/entity/structure';

export function useSaplingPermission() {
  //#region State
  // Initialize the generic store and load required data
  const genericStore = useGenericStore();
  genericStore.loadGeneric('permission', 'global', 'entity', 'role', 'person');

  const permissionEntity = computed(() => genericStore.getState('permission').entity);
  const permissionIsLoading = computed(() => genericStore.getState('permission').isLoading);

  // Reactive properties for managing persons, roles, and entities
  const persons = ref<PaginatedResponse<PersonItem>>();
  const roles = ref<PaginatedResponse<RoleItem>>();
  const entities = ref<PaginatedResponse<EntityItem>>();

  // Reactive property to manage open panels in the UI
  const openPanels = ref<number[]>([]);

  // Reactive property to manage selected models for adding persons to roles
  const addPersonSelectModels = reactive<Record<string, number | null>>({});

  // Reactive property to manage the delete dialog state
  const deleteDialog = reactive<{ visible: boolean; person: PersonItem | null; role: RoleItem | null }>({
    visible: false,
    person: null,
    role: null,
  });

  // Local copy of open panels for UI binding
  const localOpenPanels = ref<number[]>([...openPanels.value]);
  //#endregion

  //#region Lifecycle
  watch(openPanels, (val) => {
    localOpenPanels.value = [...val];
  });

  // Fetch initial data for persons, roles, and entities on component mount
  onMounted(async () => {
    persons.value = (await ApiGenericService.find<PersonItem>('person', { relations: ['roles'] }));
    roles.value = (await ApiGenericService.find<RoleItem>('role', { relations: ['m:1', 'permissions', 'persons'] }));
    entities.value = (await ApiGenericService.find<EntityItem>('entity'));
  });
  //#endregion

  //#region Methods
  /**
   * Get available persons for a specific role.
   * Filters out persons who are already assigned to the given role.
   * @param role - The role to check against.
   * @returns A list of available persons.
   */
  function getAvailablePersonsForRole(role: RoleItem): PersonItem[] {
    if (!persons.value) return [];

    const roleHandleStr = String(role.handle);
    return persons.value?.data
      .filter((p) => !(p.roles || []).some((r) => String(typeof r === 'object' ? r.handle : r) === roleHandleStr))
      .map((p) => ({ ...p, fullName: `${p.firstName} ${p.lastName}` }));
  }

  /**
   * Add a person to a specific role.
   * Updates the backend and refreshes the local state.
   * @param personHandle - The handle of the person to add.
   * @param role - The role to which the person will be added.
   */
  async function addPersonToRole(person: PersonItem, role: RoleItem) {
    if(role.handle && person.handle != null){
      await ApiGenericService.createReference<PersonItem>('person', 'role', { handle: person.handle }, { handle: role.handle });
    }

    // Refresh roles and persons data
    roles.value = (await ApiGenericService.find<RoleItem>('role', { relations: ['m:1', 'permissions', 'persons'] }));
    persons.value = (await ApiGenericService.find<PersonItem>('person', { relations: ['roles'] }));

    // Reset the select model for the role
    addPersonSelectModels[String(role.handle)] = null;
  }

  /**
   * Open the delete dialog for removing a person from a role.
   * @param person - The person to remove.
   * @param role - The role from which the person will be removed.
   */
  function openDeleteDialog(person: PersonItem, role: RoleItem) {
    deleteDialog.visible = true;
    deleteDialog.person = person;
    deleteDialog.role = role;
  }

  /**
   * Cancel the delete operation and close the dialog.
   */
  function cancelRemovePersonFromRole() {
    deleteDialog.visible = false;
    deleteDialog.person = null;
    deleteDialog.role = null;
  }

  /**
   * Confirm the removal of a person from a role.
   * Updates the backend and refreshes the local state.
   */
  async function confirmRemovePersonFromRole() {
    if (!deleteDialog.person || !deleteDialog.role || deleteDialog.person.handle == null) {
      cancelRemovePersonFromRole();
      return;
    }

    if(deleteDialog.role.handle){
      await ApiGenericService.deleteReference<PersonItem>('person', 'role', { handle: deleteDialog.person.handle }, { handle: deleteDialog.role.handle });
    }

    // Refresh roles and persons data
    roles.value = (await ApiGenericService.find<RoleItem>('role', { relations: ['m:1', 'permissions', 'persons'] }));
    persons.value = (await ApiGenericService.find<PersonItem>('person', { relations: ['roles'] }));

    cancelRemovePersonFromRole();
  }

  /**
   * Get the title of a role stage.
   * @param stage - The stage to get the title for.
   * @returns The title of the stage.
   */
  const getStageTitle = (stage: RoleStageItem | string): string => {
    if (!stage) return 'global';
    if (typeof stage === 'string') return stage;
    if (typeof stage === 'object' && 'title' in stage) return stage.title;
    return 'global';
  };

  /**
   * Get all persons assigned to a specific role.
   * @param role - The role to check.
   * @returns A list of persons assigned to the role.
   */
  function getPersonsForRole(role: RoleItem): PersonItem[] {
    return role.persons || [];
  }

  /**
   * Get the permission for a specific role and entity.
   * @param role - The role to check.
   * @param item - The entity to check.
   * @param type - The type of permission to check.
   * @returns True if the permission is granted, false otherwise.
   */
  function getPermission(role: RoleItem, item: EntityItem, type: 'allowInsert' | 'allowRead' | 'allowUpdate' | 'allowDelete' | 'allowShow'): boolean {
    if (!role.permissions) return false;
    const perm = role.permissions.find((p) => p.entity && p.entity === item.handle);
    return perm ? perm[type] === true : false;
  }

  /**
   * Set the permission for a specific role and entity.
   * Updates the backend and modifies the local state.
   * @param role - The role to update.
   * @param item - The entity to update.
   * @param type - The type of permission to set.
   * @param value - The value to set for the permission.
   */
  function setPermission(role: RoleItem, item: EntityItem, type: 'allowInsert' | 'allowRead' | 'allowUpdate' | 'allowDelete' | 'allowShow', value: boolean) {
    const entityHandleStr = String(item.handle);
    const roleHandleStr = Number(role.handle);
    const permission = role.permissions?.find((p) => String(typeof p.entity === 'object' ? p.entity.handle : p.entity) === entityHandleStr);

    if (!permission) {
      const newPermission: PermissionItem = {
        entity: entityHandleStr,
        roles: [roleHandleStr],
        allowRead: false,
        allowInsert: false,
        allowUpdate: false,
        allowDelete: false,
        allowShow: false,
        createdAt: new Date(),
      };
      newPermission[type] = value;
      if (!role.permissions) role.permissions = [];
      role.permissions.push(newPermission);
      ApiGenericService.create<PermissionItem>('permission', newPermission);
    } else {
      permission[type] = value;
      ApiGenericService.update<PermissionItem>('permission', { entity: entityHandleStr, role: roleHandleStr }, { [type]: value });
    }
  }

  function onUpdateOpenPanels(val: number[]) {
    localOpenPanels.value = [...val];
    openPanels.value = [...val];
  }
  //#endregion

  //#region Return
  // Return all reactive properties and methods for use in components
  return {
    roles,
    entities,
    permissionEntity,
    permissionIsLoading,
    deleteDialog,
    localOpenPanels,
    getAvailablePersonsForRole,
    addPersonToRole,
    openDeleteDialog,
    cancelRemovePersonFromRole,
    confirmRemovePersonFromRole,
    getStageTitle,
    getPersonsForRole,
    getPermission,
    setPermission,
    onUpdateOpenPanels,
  };
  //#endregion
}
