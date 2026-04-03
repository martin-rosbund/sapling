import { ref, onMounted, reactive, computed, watch } from 'vue'; // Import Vue utilities for reactivity and lifecycle hooks
import ApiGenericService from '../../services/api.generic.service'; // Import the generic API service for backend communication
import type { PersonItem, RoleItem, EntityItem, RoleStageItem, PermissionItem } from '../../entity/entity'; // Import types for type safety
import { useGenericStore } from '@/stores/genericStore'; // Import the generic store composable
import type { PaginatedResponse } from '@/entity/structure';

type PermissionType = 'allowInsert' | 'allowRead' | 'allowUpdate' | 'allowDelete' | 'allowShow';

export interface RolePermissionViewModel extends RoleItem {
  activeGroup: string | null;
}

/**
 * Provides all state and actions for the permission management screen.
 */
export function useSaplingPermission() {
  //#region State
  // Initialize the generic store and load required data
  const genericStore = useGenericStore();
  genericStore.loadGeneric('permission', 'global', 'entity', 'role', 'person');

  const permissionEntity = computed(() => genericStore.getState('permission').entity);
  const permissionIsLoading = computed(() => genericStore.getState('permission').isLoading);

  // Reactive properties for managing persons, roles, and entities
  const persons = ref<PaginatedResponse<PersonItem>>();
  const roles = ref<PaginatedResponse<RolePermissionViewModel>>();
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

  const permissionGroups = computed<string[]>(() => {
    const groupHandles = (entities.value?.data || [])
      .map(getEntityGroupHandle)
      .filter((groupHandle): groupHandle is string => Boolean(groupHandle));

    return Array.from(new Set(groupHandles));
  });
  //#endregion

  //#region Lifecycle
  watch(openPanels, (val) => {
    localOpenPanels.value = [...val];
  }, { immediate: true });

  watch([
    () => roles.value?.data,
    permissionGroups,
  ], () => {
    ensureRoleGroupSelection();
  }, { immediate: true });

  // Fetch initial data for persons, roles, and entities on component mount
  onMounted(async () => {
    await Promise.all([
      refreshPersons(),
      refreshRoles(),
      refreshEntities(),
    ]);
  });
  //#endregion

  //#region Methods
  /**
   * Reloads the person list including role references.
   */
  async function refreshPersons() {
    persons.value = await ApiGenericService.find<PersonItem>('person', { relations: ['roles'] });
  }

  /**
   * Reloads the role list and enriches it with UI-only tab state.
   */
  async function refreshRoles() {
    const response = await ApiGenericService.find<RoleItem>('role', { relations: ['m:1', 'permissions', 'persons'] });
    roles.value = {
      ...response,
      data: response.data.map(role => ({
        ...role,
        activeGroup: permissionGroups.value[0] || null,
      })),
    };
  }

  /**
   * Reloads the available permission entities including their groups.
   */
  async function refreshEntities() {
    entities.value = await ApiGenericService.find<EntityItem>('entity', { relations: ['group'] });
  }

  /**
   * Extracts the string handle of an entity group independent of its loaded relation form.
   */
  function getEntityGroupHandle(entity: EntityItem): string | null {
    if (typeof entity.group === 'string') {
      return entity.group || null;
    }

    if (entity.group && typeof entity.group === 'object' && typeof entity.group.handle === 'string') {
      return entity.group.handle;
    }

    return null;
  }

  /**
   * Makes sure each role always points to a valid permission group.
   */
  function ensureRoleGroupSelection() {
    if (!roles.value) {
      return;
    }

    const availableGroups = permissionGroups.value;
    const fallbackGroup = availableGroups[0] || null;
    const nextRoles = roles.value.data.map(role => {
      const activeGroup = role.activeGroup && availableGroups.includes(role.activeGroup)
        ? role.activeGroup
        : fallbackGroup;

      return {
        ...role,
        activeGroup,
      };
    });

    const hasChanges = nextRoles.some((role, index) => role.activeGroup !== roles.value?.data[index]?.activeGroup);
    if (!hasChanges) {
      return;
    }

    roles.value = {
      ...roles.value,
      data: nextRoles,
    };
  }

  /**
   * Reloads both roles and persons after membership changes.
   */
  async function refreshRoleAssignments() {
    await Promise.all([
      refreshRoles(),
      refreshPersons(),
    ]);
  }

  /**
   * Returns all permission-relevant entities for a single UI group.
   */
  function getGroupEntities(group: string): EntityItem[] {
    return (entities.value?.data || []).filter(entity => getEntityGroupHandle(entity) === group);
  }

  /**
   * Updates the active permission group for a role panel.
   */
  function updateRoleActiveGroup(role: RolePermissionViewModel, group: string | null) {
    role.activeGroup = group;
  }

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
   * @param person - The person to add.
   * @param role - The role to which the person will be added.
   */
  async function addPersonToRole(person: PersonItem, role: RoleItem, shouldRefresh = true) {
    if (role.handle != null && person.handle != null) {
      await ApiGenericService.createReference<PersonItem>('person', 'roles', person.handle, role.handle);
    }

    if (shouldRefresh) {
      await refreshRoleAssignments();
    }

    // Reset the select model for the role
    addPersonSelectModels[String(role.handle)] = null;
  }

  /**
   * Adds multiple selected persons to a role in sequence.
   */
  async function handleAddSelectedPersonsToRole(selectedPersons: PersonItem[], role: RoleItem) {
    for (const person of selectedPersons) {
      await addPersonToRole(person, role, false);
    }

    await refreshRoleAssignments();
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
   * Synchronizes the delete dialog visibility with the dialog component.
   */
  function updateDeleteDialogVisibility(value: boolean) {
    if (!value) {
      cancelRemovePersonFromRole();
      return;
    }

    deleteDialog.visible = true;
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

    if (deleteDialog.role.handle != null) {
      await ApiGenericService.deleteReference<PersonItem>('person', 'roles', deleteDialog.person.handle, deleteDialog.role.handle);
    }

    await refreshRoleAssignments();

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
  function getPermission(role: RoleItem, item: EntityItem, type: PermissionType): boolean {
    if (!role.permissions) return false;
    const perm = role.permissions.find((permission) => {
      const entityHandle = typeof permission.entity === 'object' ? permission.entity.handle : permission.entity;
      return entityHandle === item.handle;
    });
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
  async function setPermission(role: RoleItem, item: EntityItem, type: PermissionType, value: boolean) {
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
      await ApiGenericService.create<PermissionItem>('permission', newPermission);
    } else {
      permission[type] = value;
      if (permission.handle != null) {
        await ApiGenericService.update<PermissionItem>('permission', permission.handle, { [type]: value });
      }
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
    permissionGroups,
    getGroupEntities,
    updateRoleActiveGroup,
    getAvailablePersonsForRole,
    addPersonToRole,
    handleAddSelectedPersonsToRole,
    openDeleteDialog,
    updateDeleteDialogVisibility,
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
