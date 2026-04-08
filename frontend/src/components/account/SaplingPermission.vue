<template>
    <v-container class="sapling-permission-dashboard pa-1 pa-md-2 fill-height" fluid>
        <section class="sapling-permission-hero glass-panel">
            <template v-if="permissionIsLoading">
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
            </template>
            <template v-else>
                <div class="sapling-permission-hero-copy">
                    <p class="sapling-permission-eyebrow">{{ $t('permission.accessGovernance') }}</p>
                    <h1 class="sapling-permission-title">
                        <v-icon v-if="permissionEntity?.icon" size="28">{{ permissionEntity.icon }}</v-icon>
                        <span>{{ permissionEntity?.handle ? $t(`navigation.${permissionEntity.handle}`) : $t('permission.controlCenter') }}</span>
                    </h1>
                    <p class="sapling-permission-subtitle">
                        {{ $t('permission.workspaceSubtitle') }}
                    </p>
                </div>

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
        </section>

        <template v-if="permissionIsLoading">
            <section class="sapling-permission-layout">
                <aside class="sapling-permission-sidebar glass-panel sapling-permission-loading-panel">
                    <v-skeleton-loader type="heading, list-item-two-line, list-item-two-line, list-item-two-line" />
                </aside>

                <main class="sapling-permission-main">
                    <section class="sapling-permission-selection glass-panel sapling-permission-loading-panel">
                        <v-skeleton-loader type="heading, text, text" />
                    </section>

                    <section class="sapling-permission-workspace glass-panel sapling-permission-loading-panel">
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
            <aside class="sapling-permission-sidebar glass-panel">
                <div class="sapling-permission-panel-header">
                    <div>
                        <p class="sapling-permission-section-eyebrow">{{ $t('navigation.role') }}</p>
                        <h2 class="sapling-permission-section-title">{{ $t('role.directory') }}</h2>
                    </div>
                    <v-text-field
                        v-model="roleSearch"
                        :label="$t('global.search')"
                        density="comfortable"
                        hide-details
                        rounded="lg"
                        prepend-inner-icon="mdi-magnify"
                    />
                </div>

                <v-list class="sapling-permission-role-list" density="comfortable" nav>
                    <v-list-item
                        v-for="role in filteredRoles"
                        :key="role.handle ?? role.title"
                        :active="selectedRoleHandle === role.handle"
                        class="sapling-permission-role-item"
                        @click="selectRole(role.handle ?? null)"
                    >
                        <template #prepend>
                            <div class="sapling-permission-role-avatar">
                                {{ getRoleInitial(role.title) }}
                            </div>
                        </template>

                        <v-list-item-title>{{ role.title }}</v-list-item-title>
                        <v-list-item-subtitle>{{ getStageTitle(role.stage) }}</v-list-item-subtitle>

                        <template #append>
                            <div class="sapling-permission-role-meta">
                                <v-chip size="x-small" variant="outlined">
                                    {{ getRoleMemberCount(role) }}
                                </v-chip>
                                <v-badge v-if="isRoleDirty(role)" dot color="warning" inline />
                            </div>
                        </template>
                    </v-list-item>
                </v-list>

                <div v-if="!filteredRoles.length" class="sapling-permission-empty-block">
                    {{ $t('role.noRolesMatchSearch') }}
                </div>
            </aside>

            <main class="sapling-permission-main">
                <div v-if="selectedRole" class="sapling-permission-overview-row">
                    <section class="sapling-permission-selection glass-panel">
                        <div>
                            <p class="sapling-permission-section-eyebrow">{{ $t('role.selectedRole') }}</p>
                            <h2 class="sapling-permission-selection-title">{{ selectedRole.title }}</h2>
                            <div class="sapling-permission-selection-meta">
                                <v-chip size="small" color="primary" variant="tonal">
                                    {{ getStageTitle(selectedRole.stage) }}
                                </v-chip>
                                <v-chip size="small" variant="outlined">
                                    {{ selectedRoleStats.memberCount }} {{ $t('role.persons') }}
                                </v-chip>
                                <v-chip size="small" variant="outlined">
                                    {{ selectedRoleStats.enabledPermissionCount }} {{ $t('right.enabled') }}
                                </v-chip>
                                <v-chip v-if="selectedRoleStats.dirtyEntityCount" size="small" color="warning" variant="tonal">
                                    {{ selectedRoleStats.dirtyEntityCount }} {{ $t('permission.changedEntities') }}
                                </v-chip>
                            </div>
                        </div>

                        <div class="sapling-permission-selection-status">
                            <v-alert
                                v-if="permissionSaveState === 'error' && permissionSaveError"
                                type="error"
                                density="comfortable"
                                variant="tonal"
                            >
                                {{ permissionSaveError }}
                            </v-alert>
                            <v-alert
                                v-else-if="permissionSaveState === 'saved'"
                                type="success"
                                density="comfortable"
                                variant="tonal"
                            >
                                {{ $t('permission.savedSuccessfully') }}
                            </v-alert>
                            <v-alert
                                v-else-if="hasUnsavedPermissionChanges"
                                type="warning"
                                density="comfortable"
                                variant="tonal"
                            >
                                {{ $t('permission.reviewStagedChanges') }}
                            </v-alert>
                        </div>
                    </section>

                    <section class="sapling-permission-summary glass-panel">
                        <div class="sapling-permission-summary-header">
                            <p class="sapling-permission-section-eyebrow">{{ $t('permission.workingSet') }}</p>
                            <h2 class="sapling-permission-section-title">{{ $t('permission.changeSummary') }}</h2>
                        </div>

                        <div class="sapling-permission-summary-grid">
                            <article>
                                <span>{{ $t('right.currentGroup') }}</span>
                                <strong>{{ selectedGroup ? $t(`navigationGroup.${selectedGroup}`) : $t('roleStage.none') }}</strong>
                            </article>
                            <article>
                                <span>{{ $t('permission.visibleEntities') }}</span>
                                <strong>{{ filteredGroupEntities.length }}</strong>
                            </article>
                            <article>
                                <span>{{ $t('permission.dirtyEntities') }}</span>
                                <strong>{{ selectedRoleStats.dirtyEntityCount }}</strong>
                            </article>
                            <article>
                                <span>{{ $t('permission.saveMode') }}</span>
                                <strong>{{ $t('right.manual') }}</strong>
                            </article>
                        </div>

                        <p class="sapling-permission-summary-note">
                            {{ $t('permission.summaryNote') }}
                        </p>
                    </section>
                </div>

                <section v-if="selectedRole" class="sapling-permission-workspace glass-panel">
                    <div class="sapling-permission-toolbar">
                        <v-tabs v-model="selectedGroup" class="sapling-permission-tabs" show-arrows>
                            <v-tab
                                v-for="group in permissionGroups"
                                :key="group"
                                :value="group"
                                class="sapling-permission-tab"
                            >
                                {{ $t(`navigationGroup.${group}`) }}
                            </v-tab>
                        </v-tabs>

                        <div class="sapling-permission-toolbar-actions">
                            <v-text-field
                                v-model="permissionSearch"
                                :label="$t('global.search')"
                                density="comfortable"
                                hide-details
                                rounded="lg"
                                prepend-inner-icon="mdi-filter-variant"
                            />

                            <v-btn-toggle v-model="permissionFilterMode" color="primary" density="comfortable" mandatory>
                                <v-btn value="all" variant="outlined">{{ $t('right.all') }}</v-btn>
                                <v-btn value="enabled" variant="outlined">{{ $t('right.enabled') }}</v-btn>
                                <v-btn value="disabled" variant="outlined">{{ $t('right.disabled') }}</v-btn>
                            </v-btn-toggle>
                        </div>
                    </div>

                    <v-progress-linear
                        v-if="permissionSaveState === 'saving'"
                        color="primary"
                        indeterminate
                        class="sapling-permission-progress"
                    />

                    <div v-if="filteredGroupEntities.length && lgAndUp" class="sapling-permission-matrix-shell">
                        <v-table class="sapling-permission-matrix" density="comfortable">
                            <thead>
                                <tr>
                                    <th>{{ $t('navigation.entity') }}</th>
                                    <th v-for="column in permissionColumns" :key="column.key">{{ $t(column.labelKey) }}</th>
                                    <th class="text-right">{{ $t('right.actions') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr
                                    v-for="item in filteredGroupEntities"
                                    :key="item.handle"
                                    :class="{
                                        'sapling-permission-row-dirty': isPermissionDirty(selectedRole, item),
                                        'sapling-permission-row-pending': isPermissionPending(selectedRole, item),
                                    }"
                                >
                                    <td>
                                        <div class="sapling-permission-entity-cell">
                                            <div class="sapling-permission-entity-main">
                                                <v-icon v-if="item.icon" size="18">{{ item.icon }}</v-icon>
                                                <span>{{ $t(`navigation.${item.handle}`) }}</span>
                                            </div>
                                            <div class="sapling-permission-entity-tags">
                                                <v-chip v-if="isPermissionDirty(selectedRole, item)" size="x-small" color="warning" variant="tonal">{{ $t('right.dirty') }}</v-chip>
                                                <v-chip v-if="isPermissionPending(selectedRole, item)" size="x-small" color="primary" variant="tonal">{{ $t('right.saving') }}</v-chip>
                                            </div>
                                        </div>
                                    </td>

                                    <td v-for="column in permissionColumns" :key="`${item.handle}-${column.key}`" class="text-center">
                                        <v-checkbox
                                            v-if="canUsePermission(item, column.key)"
                                            :model-value="getPermission(selectedRole, item, column.key)"
                                            hide-details
                                            density="compact"
                                            :ripple="false"
                                            @update:model-value="onPermissionToggle(item, column.key, !!$event)"
                                        />
                                        <span v-else class="sapling-permission-unavailable">-</span>
                                    </td>

                                    <td class="text-right">
                                        <div class="sapling-permission-row-actions">
                                            <v-btn size="x-small" variant="text" @click="grantEntityAccess(item)">{{ $t('right.all') }}</v-btn>
                                            <v-btn size="x-small" variant="text" @click="clearEntityAccess(item)">{{ $t('right.none') }}</v-btn>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </v-table>
                    </div>

                    <div v-else-if="filteredGroupEntities.length && !lgAndUp" class="sapling-permission-mobile-list">
                        <article
                            v-for="item in filteredGroupEntities"
                            :key="`mobile-${item.handle}`"
                            class="sapling-permission-mobile-card glass-panel"
                            :class="{
                                'sapling-permission-row-dirty': isPermissionDirty(selectedRole, item),
                                'sapling-permission-row-pending': isPermissionPending(selectedRole, item),
                            }"
                        >
                            <div class="sapling-permission-mobile-card-header">
                                <div class="sapling-permission-entity-main">
                                    <v-icon v-if="item.icon" size="18">{{ item.icon }}</v-icon>
                                    <span>{{ $t(`navigation.${item.handle}`) }}</span>
                                </div>
                                <div class="sapling-permission-row-actions">
                                    <v-btn size="x-small" variant="text" @click="grantEntityAccess(item)">{{ $t('right.all') }}</v-btn>
                                    <v-btn size="x-small" variant="text" @click="clearEntityAccess(item)">{{ $t('right.none') }}</v-btn>
                                </div>
                            </div>

                            <div class="sapling-permission-mobile-grid">
                                <div v-for="column in permissionColumns" :key="`mobile-${item.handle}-${column.key}`" class="sapling-permission-mobile-grid-row">
                                    <span>{{ $t(column.labelKey) }}</span>
                                    <v-checkbox
                                        v-if="canUsePermission(item, column.key)"
                                        :model-value="getPermission(selectedRole, item, column.key)"
                                        hide-details
                                        density="compact"
                                        :ripple="false"
                                        @update:model-value="onPermissionToggle(item, column.key, !!$event)"
                                    />
                                    <span v-else class="sapling-permission-unavailable">-</span>
                                </div>
                            </div>
                        </article>
                    </div>

                    <div v-else class="sapling-permission-empty-state">
                        {{ $t('permission.noEntitiesForFilters') }}
                    </div>
                </section>

                <section v-else class="sapling-permission-empty-state glass-panel">
                    {{ $t('role.selectRoleToEdit') }}
                </section>
            </main>

            <aside class="sapling-permission-context">
                <section class="sapling-permission-members glass-panel">
                    <div class="sapling-permission-panel-header">
                        <div>
                            <p class="sapling-permission-section-eyebrow">{{ $t('role.persons') }}</p>
                            <h2 class="sapling-permission-section-title">{{ $t('role.membersTitle') }}</h2>
                        </div>
                    </div>

                    <SaplingFieldSelectAdd
                        :label="$t('global.add')"
                        entityHandle="person"
                        :modelValue="[]"
                        :items="availablePersonsForSelectedRole"
                        :disabled="!selectedRole || membersArePending"
                        class="sapling-permission-member-add"
                        @add-selected="onAddPersons"
                    />

                    <div v-if="selectedRoleMembers.length" class="sapling-permission-member-list">
                        <article v-for="person in selectedRoleMembers" :key="person.handle ?? `${person.firstName}-${person.lastName}`" class="sapling-permission-member-card">
                            <div>
                                <strong>{{ person.firstName }} {{ person.lastName }}</strong>
                                <p>{{ person.email || person.loginName || $t('role.noContactData') }}</p>
                            </div>
                            <v-btn
                                icon="mdi-close"
                                variant="text"
                                size="small"
                                :disabled="membersArePending || !selectedRole"
                                @click="selectedRole ? openDeleteDialog(person, selectedRole) : undefined"
                            />
                        </article>
                    </div>
                    <div v-else class="sapling-permission-empty-block">
                        {{ $t('role.noMembersAssigned') }}
                    </div>
                </section>

            </aside>
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
import SaplingDialogDelete from '@/components/dialog/SaplingDialogDelete.vue';
import { useSaplingPermission } from '@/composables/account/useSaplingPermission';
import SaplingFieldSelectAdd from '../dialog/fields/SaplingFieldSelectAdd.vue';
import type { EntityItem, PersonItem } from '@/entity/entity';
import { useDisplay } from 'vuetify';

const permissionColumns = [
    { key: 'allowShow', labelKey: 'right.canShow' },
    { key: 'allowRead', labelKey: 'right.canRead' },
    { key: 'allowInsert', labelKey: 'right.canInsert' },
    { key: 'allowUpdate', labelKey: 'right.canUpdate' },
    { key: 'allowDelete', labelKey: 'right.canDelete' },
] as const;

type PermissionColumnKey = typeof permissionColumns[number]['key'];

const { lgAndUp } = useDisplay();

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
} = useSaplingPermission();

function canUsePermission(item: EntityItem, permissionType: PermissionColumnKey) {
    switch (permissionType) {
        case 'allowShow':
            return item.canShow === true;
        case 'allowRead':
            return item.canRead === true;
        case 'allowInsert':
            return item.canInsert === true;
        case 'allowUpdate':
            return item.canUpdate === true;
        case 'allowDelete':
            return item.canDelete === true;
    }
}

function onPermissionToggle(item: EntityItem, permissionType: PermissionColumnKey, value: boolean) {
    if (!selectedRole.value) {
        return;
    }

    setPermission(selectedRole.value, item, permissionType, value);
}

function grantEntityAccess(item: EntityItem) {
    if (!selectedRole.value) {
        return;
    }

    setAllPermissionsForEntity(selectedRole.value, item, true);
}

function clearEntityAccess(item: EntityItem) {
    if (!selectedRole.value) {
        return;
    }

    setAllPermissionsForEntity(selectedRole.value, item, false);
}

async function saveAllPermissions() {
    await savePermissionChanges();
}

function onAddPersons(selectedPersons: PersonItem[]) {
    void handleAddSelectedPersonsToRole(selectedPersons);
}

function getRoleInitial(title: string) {
    return title.trim().charAt(0).toUpperCase() || 'R';
}
</script>

<style scoped src="@/assets/styles/SaplingPermission.css"></style>
