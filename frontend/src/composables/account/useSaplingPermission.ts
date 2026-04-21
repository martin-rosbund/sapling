import { computed, onMounted, reactive, ref, watch } from 'vue'
import ApiGenericService from '../../services/api.generic.service'
import type {
  EntityItem,
  PermissionItem,
  PersonItem,
  RoleItem,
  RoleStageItem,
} from '../../entity/entity'
import { i18n } from '@/i18n'
import { useGenericStore } from '@/stores/genericStore'
import { useSaplingMessageCenter } from '@/composables/system/useSaplingMessageCenter'

type PermissionType = 'allowInsert' | 'allowRead' | 'allowUpdate' | 'allowDelete' | 'allowShow'
type PermissionFilterMode = 'all' | 'enabled' | 'disabled'
type PermissionSaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'
type PermissionStateSnapshot = Record<PermissionType, boolean>

const PERMISSION_FIELDS: PermissionType[] = [
  'allowShow',
  'allowRead',
  'allowInsert',
  'allowUpdate',
  'allowDelete',
]

/**
 * Provides dashboard-oriented state and actions for the permission management screen.
 */
export function useSaplingPermission() {
  //#region State
  const genericStore = useGenericStore()
  const messageCenter = useSaplingMessageCenter()

  genericStore.loadGeneric('permission', 'global', 'entity', 'role', 'roleStage', 'right', 'person')

  const permissionEntity = computed(() => genericStore.getState('permission').entity)

  const persons = ref<PersonItem[]>([])
  const roles = ref<RoleItem[]>([])
  const entities = ref<EntityItem[]>([])
  const originalRoles = ref<RoleItem[]>([])

  const roleSearch = ref('')
  const permissionSearch = ref('')
  const permissionFilterMode = ref<PermissionFilterMode>('all')
  const selectedRoleHandle = ref<number | null>(null)
  const selectedGroup = ref<string | null>(null)

  const isBootstrapping = ref(true)
  const membersArePending = ref(false)
  const permissionSaveState = ref<PermissionSaveState>('idle')
  const permissionSaveError = ref<string | null>(null)

  const pendingPermissionKeys = reactive<Record<string, boolean>>({})

  const deleteDialog = reactive<{
    visible: boolean
    person: PersonItem | null
    role: RoleItem | null
  }>({
    visible: false,
    person: null,
    role: null,
  })

  const permissionIsLoading = computed(
    () => genericStore.getState('permission').isLoading || isBootstrapping.value,
  )

  const permissionGroups = computed<string[]>(() => {
    const groupHandles = entities.value
      .map(getEntityGroupHandle)
      .filter((groupHandle): groupHandle is string => Boolean(groupHandle))

    return Array.from(new Set(groupHandles))
  })

  const filteredRoles = computed<RoleItem[]>(() => {
    const query = roleSearch.value.trim().toLowerCase()
    if (!query) {
      return roles.value
    }

    return roles.value.filter((role) => {
      const haystack = [
        role.title,
        getStageTitle(role.stage),
        ...(role.persons || []).map((person) => `${person.firstName} ${person.lastName}`),
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  })

  const selectedRole = computed<RoleItem | null>(() => {
    if (selectedRoleHandle.value == null) {
      return roles.value[0] || null
    }

    return roles.value.find((role) => role.handle === selectedRoleHandle.value) || null
  })

  const selectedRoleMembers = computed<PersonItem[]>(() => selectedRole.value?.persons || [])

  const availablePersonsForSelectedRole = computed<PersonItem[]>(() => {
    if (!selectedRole.value) {
      return []
    }

    const roleHandle = String(selectedRole.value.handle)
    return persons.value
      .filter(
        (person) =>
          !(person.roles || []).some(
            (role) => String(typeof role === 'object' ? role.handle : role) === roleHandle,
          ),
      )
      .map((person) => ({
        ...person,
        fullName: `${person.firstName} ${person.lastName}`,
      }))
  })

  const filteredGroupEntities = computed<EntityItem[]>(() => {
    if (!selectedRole.value || !selectedGroup.value) {
      return []
    }

    const role = selectedRole.value
    const query = permissionSearch.value.trim().toLowerCase()

    return entities.value.filter((entity) => {
      if (getEntityGroupHandle(entity) !== selectedGroup.value) {
        return false
      }

      if (query) {
        const entityLabel = String(entity.handle).toLowerCase()
        if (!entityLabel.includes(query)) {
          return false
        }
      }

      if (permissionFilterMode.value === 'enabled') {
        return hasAnyEnabledPermission(role, entity)
      }

      if (permissionFilterMode.value === 'disabled') {
        return !hasAnyEnabledPermission(role, entity)
      }

      return true
    })
  })

  const dashboardStats = computed(() => ({
    roleCount: roles.value.length,
    memberCount: persons.value.length,
    groupCount: permissionGroups.value.length,
    enabledPermissionCount: roles.value.reduce(
      (total, role) => total + getEnabledPermissionCount(role),
      0,
    ),
  }))

  const selectedRoleStats = computed(() => {
    if (!selectedRole.value) {
      return {
        memberCount: 0,
        enabledPermissionCount: 0,
        dirtyEntityCount: 0,
      }
    }

    return {
      memberCount: selectedRoleMembers.value.length,
      enabledPermissionCount: getEnabledPermissionCount(selectedRole.value),
      dirtyEntityCount: getDirtyEntityCount(selectedRole.value),
    }
  })

  const hasUnsavedPermissionChanges = computed(() => roles.value.some((role) => isRoleDirty(role)))
  //#endregion

  //#region Lifecycle
  watch(
    filteredRoles,
    (nextRoles) => {
      if (!nextRoles.length) {
        selectedRoleHandle.value = null
        return
      }

      if (
        selectedRoleHandle.value == null ||
        !nextRoles.some((role) => role.handle === selectedRoleHandle.value)
      ) {
        selectedRoleHandle.value = nextRoles[0].handle ?? null
      }
    },
    { immediate: true },
  )

  watch(
    permissionGroups,
    (groups) => {
      if (!groups.length) {
        selectedGroup.value = null
        return
      }

      if (!selectedGroup.value || !groups.includes(selectedGroup.value)) {
        selectedGroup.value = groups[0]
      }
    },
    { immediate: true },
  )

  watch(hasUnsavedPermissionChanges, (hasChanges) => {
    if (!hasChanges && permissionSaveState.value === 'dirty') {
      permissionSaveState.value = 'idle'
    }

    if (
      hasChanges &&
      (permissionSaveState.value === 'saved' || permissionSaveState.value === 'error')
    ) {
      permissionSaveState.value = 'dirty'
    }
  })

  onMounted(async () => {
    isBootstrapping.value = true

    try {
      await Promise.all([refreshPersons(), refreshRoles(), refreshEntities()])
    } finally {
      isBootstrapping.value = false
    }
  })
  //#endregion

  //#region Methods
  async function refreshPersons() {
    const response = await ApiGenericService.find<PersonItem>('person', { relations: ['roles'] })
    persons.value = response.data.map(clonePerson)
  }

  async function refreshRoles() {
    const response = await ApiGenericService.find<RoleItem>('role', {
      relations: ['m:1', 'permissions', 'persons'],
    })
    roles.value = cloneRoles(response.data)
    originalRoles.value = cloneRoles(response.data)
  }

  async function refreshEntities() {
    const response = await ApiGenericService.find<EntityItem>('entity', { relations: ['group'] })
    entities.value = response.data.map((entity) => ({ ...entity }))
  }

  function selectRole(roleHandle: number | null) {
    selectedRoleHandle.value = roleHandle
    permissionSaveError.value = null
  }

  function setSelectedGroup(group: string | null) {
    selectedGroup.value = group
  }

  function getEntityGroupHandle(entity: EntityItem): string | null {
    if (typeof entity.group === 'string') {
      return entity.group || null
    }

    if (
      entity.group &&
      typeof entity.group === 'object' &&
      typeof entity.group.handle === 'string'
    ) {
      return entity.group.handle
    }

    return null
  }

  function getPermissionTypesForEntity(entity: EntityItem): PermissionType[] {
    return PERMISSION_FIELDS.filter((permissionType) => {
      switch (permissionType) {
        case 'allowShow':
          return entity.canShow === true
        case 'allowRead':
          return entity.canRead === true
        case 'allowInsert':
          return entity.canInsert === true
        case 'allowUpdate':
          return entity.canUpdate === true
        case 'allowDelete':
          return entity.canDelete === true
      }
    })
  }

  function getPermission(role: RoleItem, item: EntityItem, type: PermissionType): boolean {
    return getPermissionState(getPermissionRecord(role, item.handle))[type]
  }

  function setPermission(role: RoleItem, item: EntityItem, type: PermissionType, value: boolean) {
    const permission = ensurePermissionRecord(role, item)
    permission[type] = value

    const baselinePermission = getBaselinePermission(role.handle, item.handle)
    if (!baselinePermission && !isPermissionRecordEnabled(permission)) {
      role.permissions = (role.permissions || []).filter(
        (entry) => getPermissionEntityHandle(entry) !== item.handle,
      )
    }

    permissionSaveError.value = null
    permissionSaveState.value = hasUnsavedPermissionChanges.value ? 'dirty' : 'idle'
  }

  function setAllPermissionsForEntity(role: RoleItem, item: EntityItem, value: boolean) {
    for (const permissionType of getPermissionTypesForEntity(item)) {
      setPermission(role, item, permissionType, value)
    }
  }

  async function savePermissionChanges() {
    if (!hasUnsavedPermissionChanges.value || permissionSaveState.value === 'saving') {
      return
    }

    permissionSaveState.value = 'saving'
    permissionSaveError.value = null

    try {
      for (const role of roles.value) {
        if (role.handle == null || !isRoleDirty(role)) {
          continue
        }

        await persistRolePermissions(role)
      }

      originalRoles.value = cloneRoles(roles.value)
      permissionSaveState.value = 'saved'
      messageCenter.pushMessage('success', i18n.global.t('permission.saved'), '', 'permission')
    } catch (error: unknown) {
      permissionSaveState.value = 'error'
      permissionSaveError.value =
        error instanceof Error ? error.message : i18n.global.t('permission.saveFailed')
      throw error
    }
  }

  function resetPermissionChanges() {
    roles.value = cloneRoles(originalRoles.value)
    permissionSearch.value = ''
    permissionFilterMode.value = 'all'
    permissionSaveError.value = null
    permissionSaveState.value = 'idle'
  }

  async function handleAddSelectedPersonsToRole(selectedPersons: PersonItem[]) {
    const role = selectedRole.value
    if (!role || role.handle == null || !selectedPersons.length) {
      return
    }

    membersArePending.value = true

    try {
      for (const person of selectedPersons) {
        if (person.handle == null) {
          continue
        }

        await ApiGenericService.createReference<PersonItem>(
          'person',
          'roles',
          person.handle,
          role.handle,
        )
        applyMembershipChange(person, role, true)
      }
    } finally {
      membersArePending.value = false
    }
  }

  function openDeleteDialog(person: PersonItem, role: RoleItem) {
    deleteDialog.visible = true
    deleteDialog.person = person
    deleteDialog.role = role
  }

  function updateDeleteDialogVisibility(value: boolean) {
    deleteDialog.visible = value
  }

  function cancelRemovePersonFromRole() {
    deleteDialog.visible = false
    deleteDialog.person = null
    deleteDialog.role = null
  }

  async function confirmRemovePersonFromRole() {
    if (
      !deleteDialog.person ||
      !deleteDialog.role ||
      deleteDialog.person.handle == null ||
      deleteDialog.role.handle == null
    ) {
      cancelRemovePersonFromRole()
      return
    }

    membersArePending.value = true

    try {
      await ApiGenericService.deleteReference<PersonItem>(
        'person',
        'roles',
        deleteDialog.person.handle,
        deleteDialog.role.handle,
      )
      applyMembershipChange(deleteDialog.person, deleteDialog.role, false)
      cancelRemovePersonFromRole()
    } finally {
      membersArePending.value = false
    }
  }

  const getStageTitle = (stage: RoleStageItem | string): string => {
    if (!stage) return 'global'
    if (typeof stage === 'string') return stage
    if (typeof stage === 'object' && 'title' in stage) return stage.title
    return 'global'
  }

  function isRoleDirty(role: RoleItem): boolean {
    return entities.value.some((entity) => isPermissionDirty(role, entity))
  }

  function isPermissionDirty(role: RoleItem, entity: EntityItem): boolean {
    const currentState = getPermissionState(getPermissionRecord(role, entity.handle))
    const baselineState = getPermissionState(getBaselinePermission(role.handle, entity.handle))

    return PERMISSION_FIELDS.some((field) => currentState[field] !== baselineState[field])
  }

  function isPermissionPending(role: RoleItem, entity: EntityItem): boolean {
    return Boolean(pendingPermissionKeys[getPermissionMutationKey(role.handle, entity.handle)])
  }

  function getRoleMemberCount(role: RoleItem): number {
    return role.persons?.length || 0
  }

  function getEnabledPermissionCount(role: RoleItem): number {
    return (role.permissions || []).reduce(
      (total, permission) =>
        total + PERMISSION_FIELDS.filter((field) => permission[field] === true).length,
      0,
    )
  }

  function getDirtyEntityCount(role: RoleItem): number {
    return entities.value.filter((entity) => isPermissionDirty(role, entity)).length
  }

  function hasAnyEnabledPermission(role: RoleItem, entity: EntityItem): boolean {
    const permissionState = getPermissionState(getPermissionRecord(role, entity.handle))
    return PERMISSION_FIELDS.some((field) => permissionState[field])
  }

  function applyMembershipChange(person: PersonItem, role: RoleItem, shouldAdd: boolean) {
    roles.value = roles.value.map((entry) =>
      updateRoleMembership(entry, role.handle, person, shouldAdd),
    )
    originalRoles.value = originalRoles.value.map((entry) =>
      updateRoleMembership(entry, role.handle, person, shouldAdd),
    )

    persons.value = persons.value.map((entry) => {
      if (entry.handle !== person.handle) {
        return entry
      }

      const nextRoles = [...(entry.roles || [])]
      const nextRoleReference = { handle: role.handle, title: role.title } as RoleItem

      if (shouldAdd) {
        if (
          !nextRoles.some(
            (roleEntry) =>
              String(typeof roleEntry === 'object' ? roleEntry.handle : roleEntry) ===
              String(role.handle),
          )
        ) {
          nextRoles.push(nextRoleReference)
        }

        return {
          ...entry,
          roles: nextRoles,
        }
      }

      return {
        ...entry,
        roles: nextRoles.filter(
          (roleEntry) =>
            String(typeof roleEntry === 'object' ? roleEntry.handle : roleEntry) !==
            String(role.handle),
        ),
      }
    })
  }

  async function persistRolePermissions(role: RoleItem) {
    const originalRole = getRoleByHandle(originalRoles.value, role.handle)

    for (const entity of entities.value) {
      if (!isPermissionDirty(role, entity)) {
        continue
      }

      const permissionKey = getPermissionMutationKey(role.handle, entity.handle)
      pendingPermissionKeys[permissionKey] = true

      try {
        const currentPermission = getPermissionRecord(role, entity.handle)
        const baselinePermission = originalRole
          ? getPermissionRecord(originalRole, entity.handle)
          : undefined
        const permissionState = getPermissionState(currentPermission)

        if (!baselinePermission) {
          if (!isPermissionStateEnabled(permissionState)) {
            continue
          }

          const createdPermission = await ApiGenericService.create<PermissionItem>('permission', {
            entity: entity.handle,
            roles: role.handle != null ? [role.handle] : [],
            createdAt: new Date(),
            ...permissionState,
          })

          assignPermissionResponse(role, entity.handle, createdPermission)
          continue
        }

        const permissionHandle =
          getPermissionRecordHandle(currentPermission) ??
          getPermissionRecordHandle(baselinePermission)
        if (permissionHandle == null) {
          continue
        }

        const updatedPermission = await ApiGenericService.update<PermissionItem>(
          'permission',
          permissionHandle,
          permissionState,
        )
        assignPermissionResponse(role, entity.handle, updatedPermission)
      } finally {
        pendingPermissionKeys[permissionKey] = false
      }
    }
  }

  function assignPermissionResponse(
    role: RoleItem,
    entityHandle: string,
    permission: PermissionItem,
  ) {
    const existingPermission = getPermissionRecord(role, entityHandle)
    if (existingPermission) {
      Object.assign(existingPermission, clonePermission(permission))
      return
    }

    if (!role.permissions) {
      role.permissions = []
    }

    role.permissions.push(clonePermission(permission))
  }

  function ensurePermissionRecord(role: RoleItem, entity: EntityItem): PermissionItem {
    const existingPermission = getPermissionRecord(role, entity.handle)
    if (existingPermission) {
      return existingPermission
    }

    const createdPermission: PermissionItem = {
      entity: entity.handle,
      roles: role.handle != null ? [role.handle] : [],
      allowRead: false,
      allowInsert: false,
      allowUpdate: false,
      allowDelete: false,
      allowShow: false,
      createdAt: new Date(),
    }

    if (!role.permissions) {
      role.permissions = []
    }

    role.permissions.push(createdPermission)
    return createdPermission
  }

  function getBaselinePermission(
    roleHandle: number | null,
    entityHandle: string,
  ): PermissionItem | undefined {
    const baselineRole = getRoleByHandle(originalRoles.value, roleHandle)
    return baselineRole ? getPermissionRecord(baselineRole, entityHandle) : undefined
  }

  function getPermissionRecord(role: RoleItem, entityHandle: string): PermissionItem | undefined {
    return role.permissions?.find(
      (permission) => getPermissionEntityHandle(permission) === entityHandle,
    )
  }

  function getPermissionEntityHandle(permission: PermissionItem): string {
    return typeof permission.entity === 'object'
      ? permission.entity.handle
      : String(permission.entity)
  }

  function getPermissionRecordHandle(permission?: PermissionItem): number | string | null {
    if (!permission || typeof permission !== 'object') {
      return null
    }

    return 'handle' in permission
      ? ((permission.handle as number | string | null | undefined) ?? null)
      : null
  }

  function getPermissionState(permission?: PermissionItem): PermissionStateSnapshot {
    return {
      allowShow: permission?.allowShow === true,
      allowRead: permission?.allowRead === true,
      allowInsert: permission?.allowInsert === true,
      allowUpdate: permission?.allowUpdate === true,
      allowDelete: permission?.allowDelete === true,
    }
  }

  function isPermissionRecordEnabled(permission: PermissionItem): boolean {
    return isPermissionStateEnabled(getPermissionState(permission))
  }

  function isPermissionStateEnabled(permissionState: PermissionStateSnapshot): boolean {
    return PERMISSION_FIELDS.some((field) => permissionState[field])
  }

  function getPermissionMutationKey(roleHandle: number | null, entityHandle: string): string {
    return `${String(roleHandle)}:${entityHandle}`
  }

  function getRoleByHandle(roleList: RoleItem[], roleHandle: number | null): RoleItem | undefined {
    return roleList.find((role) => role.handle === roleHandle)
  }

  function cloneRoles(roleList: RoleItem[]): RoleItem[] {
    return roleList.map(cloneRole)
  }

  function cloneRole(role: RoleItem): RoleItem {
    return {
      ...role,
      persons: (role.persons || []).map(clonePerson),
      permissions: (role.permissions || []).map(clonePermission),
    }
  }

  function clonePerson(person: PersonItem): PersonItem {
    return {
      ...person,
      roles: [...(person.roles || [])],
    }
  }

  function clonePermission(permission: PermissionItem): PermissionItem {
    return {
      ...permission,
      roles: [...(permission.roles || [])],
      entity: typeof permission.entity === 'object' ? { ...permission.entity } : permission.entity,
    }
  }

  function updateRoleMembership(
    role: RoleItem,
    targetRoleHandle: number | null,
    person: PersonItem,
    shouldAdd: boolean,
  ): RoleItem {
    if (role.handle !== targetRoleHandle) {
      return role
    }

    const personsForRole = [...(role.persons || [])]

    if (shouldAdd) {
      if (!personsForRole.some((entry) => entry.handle === person.handle)) {
        personsForRole.push(clonePerson(person))
      }

      return {
        ...role,
        persons: personsForRole,
      }
    }

    return {
      ...role,
      persons: personsForRole.filter((entry) => entry.handle !== person.handle),
    }
  }
  //#endregion

  //#region Return
  return {
    roles,
    roleSearch,
    filteredRoles,
    selectedRole,
    selectedRoleHandle,
    selectedGroup,
    permissionGroups,
    permissionSearch,
    permissionFilterMode,
    filteredGroupEntities,
    selectedRoleMembers,
    availablePersonsForSelectedRole,
    dashboardStats,
    selectedRoleStats,
    permissionEntity,
    permissionIsLoading,
    membersArePending,
    deleteDialog,
    permissionSaveState,
    permissionSaveError,
    hasUnsavedPermissionChanges,
    selectRole,
    setSelectedGroup,
    setPermission,
    setAllPermissionsForEntity,
    savePermissionChanges,
    resetPermissionChanges,
    handleAddSelectedPersonsToRole,
    openDeleteDialog,
    updateDeleteDialogVisibility,
    cancelRemovePersonFromRole,
    confirmRemovePersonFromRole,
    getStageTitle,
    getPermission,
    isRoleDirty,
    isPermissionDirty,
    isPermissionPending,
    getRoleMemberCount,
    getEnabledPermissionCount,
  }
  //#endregion
}
