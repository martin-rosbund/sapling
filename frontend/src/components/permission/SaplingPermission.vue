<template>
  <v-container class="sapling-permission-dashboard pa-1 fill-height" fluid>
    <section v-if="permissionIsLoading" class="sapling-permission-hero glass-panel">
      <div class="sapling-permission-hero-copy">
        <v-skeleton-loader type="heading, text" />
      </div>

      <div class="sapling-permission-hero-side">
        <div class="sapling-permission-stat-grid">
          <v-skeleton-loader v-for="item in 4" :key="item" type="article" />
        </div>

        <div class="sapling-permission-hero-actions">
          <v-skeleton-loader v-for="item in 2" :key="item" type="button" />
        </div>
      </div>
    </section>
    <SaplingPageHero
      v-else
      class="sapling-permission-hero"
      variant="workspace"
      :eyebrow="$t('permission.accessGovernance')"
      :title="
        permissionEntity?.handle
          ? $t(`navigation.${permissionEntity.handle}`)
          : $t('permission.controlCenter')
      "
      :subtitle="$t('permission.workspaceSubtitle')"
    >
      <template #title-prefix>
        <v-icon v-if="permissionEntity?.icon" size="28">{{ permissionEntity.icon }}</v-icon>
      </template>

      <template #side>
        <div class="sapling-permission-hero-side">
          <div class="sapling-permission-stat-grid">
            <article class="sapling-permission-stat-card">
              <span>{{ $t('role.roles') }}</span>
              <strong>{{ dashboardStats.roleCount }}</strong>
            </article>
            <article class="sapling-permission-stat-card">
              <span>{{ $t('role.members') }}</span>
              <strong>{{ dashboardStats.memberCount }}</strong>
            </article>
            <article class="sapling-permission-stat-card">
              <span>{{ $t('right.groups') }}</span>
              <strong>{{ dashboardStats.groupCount }}</strong>
            </article>
            <article class="sapling-permission-stat-card">
              <span>{{ $t('right.enabledRights') }}</span>
              <strong>{{ dashboardStats.enabledPermissionCount }}</strong>
            </article>
          </div>

          <div class="sapling-permission-hero-actions">
            <v-chip
              v-if="hasUnsavedPermissionChanges"
              color="warning"
              variant="tonal"
              prepend-icon="mdi-alert-circle-outline"
            >
              {{ $t('permission.unsavedChanges') }}
            </v-chip>
            <v-btn
              variant="text"
              prepend-icon="mdi-restore"
              :disabled="!hasUnsavedPermissionChanges || permissionSaveState === 'saving'"
              @click="resetPermissionChanges"
            >
              {{ $t('global.cancel') }}
            </v-btn>
            <v-btn
              color="primary"
              prepend-icon="mdi-content-save"
              :loading="permissionSaveState === 'saving'"
              :disabled="!hasUnsavedPermissionChanges"
              @click="saveAllPermissions"
            >
              {{ $t('global.save') }}
            </v-btn>
          </div>
        </div>
      </template>
    </SaplingPageHero>

    <template v-if="permissionIsLoading">
      <section class="sapling-permission-layout">
        <aside class="sapling-permission-sidebar glass-panel sapling-permission-loading-panel">
          <v-skeleton-loader
            type="heading, list-item-two-line, list-item-two-line, list-item-two-line"
          />
        </aside>

        <main class="sapling-permission-main">
          <section
            class="sapling-permission-selection glass-panel sapling-permission-loading-panel"
          >
            <v-skeleton-loader type="heading, text, text" />
          </section>

          <section
            class="sapling-permission-workspace glass-panel sapling-permission-loading-panel"
          >
            <v-skeleton-loader type="heading, table-heading, table-tbody" />
          </section>
        </main>

        <aside class="sapling-permission-context">
          <section class="sapling-permission-members glass-panel sapling-permission-loading-panel">
            <v-skeleton-loader type="heading, article, article" />
          </section>
        </aside>
      </section>
    </template>

    <section v-else class="sapling-permission-layout">
      <SaplingPermissionRoleSidebar
        v-model:role-search="roleSearch"
        :roles="filteredRoles"
        :selected-role-handle="selectedRoleHandle"
        :get-stage-title="getStageTitle"
        :get-role-initial="getRoleInitial"
        :get-role-member-count="getRoleMemberCount"
        :is-role-dirty="isRoleDirty"
        @select-role="selectRole"
      />

      <main class="sapling-permission-main">
        <SaplingPermissionOverview
          :selected-role="selectedRole"
          :selected-role-stats="selectedRoleStats"
          :selected-group="selectedGroup"
          :visible-entity-count="filteredGroupEntities.length"
          :permission-save-state="permissionSaveState"
          :permission-save-error="permissionSaveError"
          :has-unsaved-permission-changes="hasUnsavedPermissionChanges"
          :get-stage-title="getStageTitle"
        />

        <SaplingPermissionWorkspace
          v-if="selectedRole"
          v-model:selected-group="selectedGroup"
          v-model:permission-search="permissionSearch"
          v-model:permission-filter-mode="permissionFilterMode"
          :selected-role="selectedRole"
          :permission-groups="permissionGroups"
          :permission-save-state="permissionSaveState"
          :entities="filteredGroupEntities"
          :can-use-permission="canUsePermission"
          :get-permission="getPermission"
          :is-permission-dirty="isPermissionDirty"
          :is-permission-pending="isPermissionPending"
          @toggle-permission="onPermissionToggle"
          @grant-entity-access="grantEntityAccess"
          @clear-entity-access="clearEntityAccess"
        />

        <section v-else class="sapling-permission-empty-state glass-panel">
          {{ $t('role.selectRoleToEdit') }}
        </section>
      </main>

      <SaplingPermissionMembersPanel
        :selected-role="selectedRole"
        :members-are-pending="membersArePending"
        :available-persons="availablePersonsForSelectedRole"
        :selected-role-members="selectedRoleMembers"
        @add-persons="onAddPersons"
        @remove-person="onRemovePerson"
      />
    </section>

    <SaplingDialogDelete
      v-if="deleteDialog.visible"
      :model-value="deleteDialog.visible"
      :item="deleteDialog.person"
      @update:model-value="updateDeleteDialogVisibility"
      @confirm="confirmRemovePersonFromRole"
      @cancel="cancelRemovePersonFromRole"
    />
  </v-container>
</template>

<script lang="ts" setup>
import SaplingPageHero from '@/components/common/SaplingPageHero.vue'
import SaplingDialogDelete from '@/components/dialog/SaplingDialogDelete.vue'
import { useSaplingPermission } from '@/composables/account/useSaplingPermission'
import SaplingPermissionMembersPanel from '@/components/permission/SaplingPermissionMembersPanel.vue'
import SaplingPermissionOverview from '@/components/permission/SaplingPermissionOverview.vue'
import SaplingPermissionRoleSidebar from '@/components/permission/SaplingPermissionRoleSidebar.vue'
import SaplingPermissionWorkspace from '@/components/permission/SaplingPermissionWorkspace.vue'
import type { EntityItem, PersonItem } from '@/entity/entity'

type PermissionColumnKey = 'allowShow' | 'allowRead' | 'allowInsert' | 'allowUpdate' | 'allowDelete'

const {
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
} = useSaplingPermission()

function canUsePermission(item: EntityItem, permissionType: PermissionColumnKey) {
  switch (permissionType) {
    case 'allowShow':
      return item.canShow === true
    case 'allowRead':
      return item.canRead === true
    case 'allowInsert':
      return item.canInsert === true
    case 'allowUpdate':
      return item.canUpdate === true
    case 'allowDelete':
      return item.canDelete === true
  }
}

function onPermissionToggle(item: EntityItem, permissionType: PermissionColumnKey, value: boolean) {
  if (!selectedRole.value) {
    return
  }

  setPermission(selectedRole.value, item, permissionType, value)
}

function grantEntityAccess(item: EntityItem) {
  if (!selectedRole.value) {
    return
  }

  setAllPermissionsForEntity(selectedRole.value, item, true)
}

function clearEntityAccess(item: EntityItem) {
  if (!selectedRole.value) {
    return
  }

  setAllPermissionsForEntity(selectedRole.value, item, false)
}

async function saveAllPermissions() {
  await savePermissionChanges()
}

function onAddPersons(selectedPersons: PersonItem[]) {
  void handleAddSelectedPersonsToRole(selectedPersons)
}

function onRemovePerson(person: PersonItem) {
  if (!selectedRole.value) {
    return
  }

  openDeleteDialog(person, selectedRole.value)
}

function getRoleInitial(title: string) {
  return title.trim().charAt(0).toUpperCase() || 'R'
}
</script>

<style scoped src="@/assets/styles/SaplingPermission.css"></style>
