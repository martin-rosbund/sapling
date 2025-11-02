import { ref, onMounted, watch, reactive } from 'vue';
import ApiGenericService from '../services/api.generic.service';
import TranslationService from '@/services/translation.service';
import { i18n } from '@/i18n';
import type { PersonItem, RoleItem, EntityItem, RoleStageItem, PermissionItem } from '../entity/entity';

export function useSaplingPermission() {
  const persons = ref<PersonItem[]>([]);
  const roles = ref<RoleItem[]>([]);
  const entities = ref<EntityItem[]>([]);
  const entity = ref<EntityItem | null>(null);
  const openPanels = ref<number[]>([]);
  const translationService = ref(new TranslationService());
  const isLoading = ref(true);
  const addPersonSelectModels = reactive<Record<string, number|null>>({});
  const deleteDialog = reactive<{ visible: boolean, person: PersonItem | null, role: RoleItem | null }>({ visible: false, person: null, role: null });

  onMounted(async () => {
    await loadEntity();
    await loadTranslations();
    persons.value = (await ApiGenericService.find<PersonItem>('person', {relations: ['roles'] })).data;
    roles.value = (await ApiGenericService.find<RoleItem>('role', {relations: ['m:1', 'permissions'] })).data;
    entities.value = (await ApiGenericService.find<EntityItem>('entity')).data;
  });

  watch(() => i18n.global.locale.value, async () => {
    await loadTranslations();
  });

  async function loadTranslations() {
    isLoading.value = true;
    await translationService.value.prepare('global', 'entity', 'role', 'person', 'permission');
    isLoading.value = false;
  }

  function getAvailablePersonsForRole(role: RoleItem): PersonItem[] {
    const roleHandleStr = String(role.handle);
    return persons.value
      .filter(p => !(p.roles || []).some(r => String(typeof r === 'object' ? r.handle : r) === roleHandleStr))
      .map(p => ({ ...p, fullName: `${p.firstName} ${p.lastName}` }));
  }

  async function addPersonToRole(personHandle: number, role: RoleItem) {
    const person = persons.value.find(p => p.handle === personHandle);
    if (!person || person.handle == null) return;
    const newRoles = [...(person.roles || []).map(r => String(typeof r === 'object' ? r.handle : r)), String(role.handle)];
    await ApiGenericService.update<PersonItem>('person', { handle: person.handle }, { roles: newRoles }, { relations: ['roles'] });
    roles.value = (await ApiGenericService.find<RoleItem>('role', {relations: ['m:1', 'permissions'] })).data;
    persons.value = (await ApiGenericService.find<PersonItem>('person', {relations: ['roles'] })).data;
    addPersonSelectModels[String(role.handle)] = null;
  }

  function openDeleteDialog(person: PersonItem, role: RoleItem) {
    deleteDialog.visible = true;
    deleteDialog.person = person;
    deleteDialog.role = role;
  }

  function cancelRemovePersonFromRole() {
    deleteDialog.visible = false;
    deleteDialog.person = null;
    deleteDialog.role = null;
  }

  async function confirmRemovePersonFromRole() {
    if (!deleteDialog.person || !deleteDialog.role || deleteDialog.person.handle == null) {
      cancelRemovePersonFromRole();
      return;
    }
    const roleHandleStr = String(deleteDialog.role.handle);
    const newRoles = (deleteDialog.person.roles || []).filter(r => String(typeof r === 'object' ? r.handle : r) !== roleHandleStr);
    await ApiGenericService.update<PersonItem>('person', { handle: deleteDialog.person.handle }, { roles: newRoles }, { relations: ['roles'] });
    roles.value = (await ApiGenericService.find<RoleItem>('role', {relations: ['m:1', 'permissions'] })).data;
    persons.value = (await ApiGenericService.find<PersonItem>('person', {relations: ['roles'] })).data;
    cancelRemovePersonFromRole();
  }

  const getStageTitle = (stage: RoleStageItem | string): string => {
    if (!stage) return 'global';
    if (typeof stage === 'string') return stage;
    if (typeof stage === 'object' && 'title' in stage) return stage.title;
    return 'global';
  };

  function getPersonsForRole(role: RoleItem): PersonItem[] {
    const roleHandleStr = String(role.handle);
    return persons.value.filter(p => (p.roles || []).some(r => String(typeof r === 'object' ? r.handle : r) === roleHandleStr));
  }

  function getPermission(role: RoleItem, item: EntityItem, type: 'allowInsert'|'allowRead'|'allowUpdate'|'allowDelete'|'allowShow'): boolean {
    if (!role.permissions) return false;
    const perm = role.permissions.find(p => p.entity && p.entity === item.handle);
    return perm ? perm[type] === true : false;
  }

  function setPermission(role: RoleItem, item: EntityItem, type: 'allowInsert'|'allowRead'|'allowUpdate'|'allowDelete'|'allowShow', value: boolean) {
    const entityHandleStr = String(item.handle);
    const roleHandleStr = String(role.handle);
    const permission = role.permissions?.find(p => String(typeof p.entity === 'object' ? p.entity.handle : p.entity) === entityHandleStr);
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
      ApiGenericService.create<PermissionItem>('permission', newPermission)
    } else {
      permission[type] = value;
      ApiGenericService.update<PermissionItem>('permission', { entity: entityHandleStr, role: roleHandleStr }, { [type]: value })
    }
  }

  async function loadEntity() {
    entity.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { handle: 'permission' }, limit: 1, page: 1 })).data[0] || null;
  }

  return {
    persons,
    roles,
    entities,
    entity,
    openPanels,
    translationService,
    isLoading,
    addPersonSelectModels,
    deleteDialog,
    loadTranslations,
    getAvailablePersonsForRole,
    addPersonToRole,
    openDeleteDialog,
    cancelRemovePersonFromRole,
    confirmRemovePersonFromRole,
    getStageTitle,
    getPersonsForRole,
    getPermission,
    setPermission,
    loadEntity,
  };
}
