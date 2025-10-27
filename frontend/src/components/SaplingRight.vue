<template>
    <v-container class="fill-height pa-0" fluid>
        <v-row class="fill-height" no-gutters>
            <v-skeleton-loader
            v-if="isLoading"
            elevation="12"
            class="sapling-skeleton-loader"
            type="article, actions, table"/>
            <template v-else>
                <!-- Neue rollenbasierte Rechteverwaltung -->
                <v-col cols="12" class="d-flex flex-column">
                    <v-card flat class="rounded-0">
                        <v-card-title class="bg-primary text-white">
                            <v-icon left>{{ entity?.icon }}</v-icon> {{ $t(`navigation.${entity?.handle}`) }}
                        </v-card-title>
                        <v-divider></v-divider>
                        <v-card-text class="pa-0">
                            <v-expansion-panels v-model="openPanels" multiple>
                                <v-expansion-panel
                                    v-for="role in roles"
                                    :key="role.handle ?? role.title"
                                >
                                    <v-expansion-panel-title>
                                        <div class="role-header-row sapling-role-header-row">
                                            <div class="role-header-label sapling-role-header-label">{{ $t(`navigation.role`) }}</div>
                                            <div class="role-header-value sapling-role-header-value"><v-chip color="primary" class="ma-1" small>{{ role.title }}</v-chip></div>
                                            <div class="role-header-label sapling-role-header-label">{{ $t(`role.stage`) }}</div>
                                            <div class="role-header-value sapling-role-header-value"><v-chip class="ma-1" small>{{ getStageTitle(role.stage) }}</v-chip></div>
                                            <div class="role-header-label sapling-role-header-label">{{ $t(`role.persons`) }}</div>
                                            <div class="role-header-value sapling-role-header-value">
                                                <v-select
                                                    v-model="addPersonSelectModels[String(role.handle)]"
                                                    :items="getAvailablePersonsForRole(role)"
                                                    item-title="fullName"
                                                    item-value="handle"
                                                    :label="$t('global.add')"
                                                    dense
                                                    hide-details
                                                    @update:model-value="val => addPersonToRole(val, role)"
                                                    :menu-props="{ maxHeight: '200px' }"
                                                    class="sapling-add-person-select"
                                                    @mousedown.stop
                                                    @click.stop
                                                />
                                                <div class="role-person-chips sapling-role-person-chips">
                                                    <v-chip
                                                        v-for="person in getPersonsForRole(role)"
                                                        :key="'person-'+person.handle"
                                                        color="secondary"
                                                        small
                                                    >
                                                        <span class="sapling-person-chip-label">{{ person.firstName }} {{ person.lastName }}</span>
                                                        <v-btn icon size="x-small" @click.stop="openDeleteDialog(person, role)"><v-icon small>mdi-close</v-icon></v-btn>
                                                    </v-chip>
                                                </div>
                                                <EntityDeleteDialog
                                                    v-if="deleteDialog.visible"
                                                    :model-value="deleteDialog.visible"
                                                    :item="deleteDialog.person"
                                                    @update:model-value="val => deleteDialog.visible = val"
                                                    @confirm="confirmRemovePersonFromRole"
                                                    @cancel="cancelRemovePersonFromRole"
                                                />
                                            </div>
                                        </div>
                                    </v-expansion-panel-title>
                                    <v-expansion-panel-text>
                                        <v-table class="elevation-0" density="compact">
                                            <thead>
                                                <tr>
                                                    <th style="width:140px">{{ $t(`navigation.entity`) }}</th>
                                                    <th style="width:60px">{{ $t(`permission.allowInsert`) }}</th>
                                                    <th style="width:60px">{{ $t(`permission.allowRead`) }}</th>
                                                    <th style="width:60px">{{ $t(`permission.allowUpdate`) }}</th>
                                                    <th style="width:60px">{{ $t(`permission.allowDelete`) }}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr v-for="item in entities" :key="item.handle">
                                                    <td>
                                                        <v-icon v-if="item.icon" left small>{{ item.icon }}</v-icon>
                                                        {{ $t(`navigation.${item.handle}`) }}
                                                    </td>
                                                    <td class="text-center">
                                                        <v-checkbox
                                                            v-if="item.canInsert"
                                                            :model-value="getPermission(role, item, 'allowInsert')"
                                                            @update:model-value="val => setPermission(role, item, 'allowInsert', !!val)"
                                                            hide-details density="compact" :ripple="false"
                                                        />
                                                    </td>
                                                    <td class="text-center">
                                                        <v-checkbox
                                                            :model-value="getPermission(role, item, 'allowRead')"
                                                            @update:model-value="val => setPermission(role, item, 'allowRead', !!val)"
                                                            hide-details density="compact" :ripple="false"
                                                        />
                                                    </td>
                                                    <td class="text-center">
                                                        <v-checkbox
                                                            v-if="item.canUpdate"
                                                            :model-value="getPermission(role, item, 'allowUpdate')"
                                                            @update:model-value="val => setPermission(role, item, 'allowUpdate', !!val)"
                                                            hide-details density="compact" :ripple="false"
                                                        />
                                                    </td>
                                                    <td class="text-center">
                                                        <v-checkbox
                                                            v-if="item.canDelete"
                                                            :model-value="getPermission(role, item, 'allowDelete')"
                                                            @update:model-value="val => setPermission(role, item, 'allowDelete', !!val)"
                                                            hide-details density="compact" :ripple="false"
                                                        />
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </v-table>
                                    </v-expansion-panel-text>
                                </v-expansion-panel>
                            </v-expansion-panels>
                        </v-card-text>
                    </v-card>
                </v-col>
            </template>
        </v-row>
    </v-container>
</template>

<script setup lang="ts">

// #region Imports
import '@/assets/styles/SaplingRight.css';
import { ref, onMounted, watch, reactive } from 'vue';
import type { PersonItem, RoleItem, EntityItem, RoleStageItem, PermissionItem } from '../entity/entity';
import ApiGenericService from '../services/api.generic.service';
import TranslationService from '@/services/translation.service';
import { i18n } from '@/i18n';
import EntityDeleteDialog from './dialog/EntityDeleteDialog.vue';
// Hilfsfunktion: Gibt Personen zurück, die noch nicht in der Rolle sind
function getAvailablePersonsForRole(role: RoleItem): PersonItem[] {
    const roleHandleStr = String(role.handle);
    return persons.value
        .filter(p => !(p.roles || []).some(r => String(typeof r === 'object' ? r.handle : r) === roleHandleStr))
        .map(p => ({ ...p, fullName: `${p.firstName} ${p.lastName}` }));
}

// Fügt eine Person zu einer Rolle hinzu (API Update)
async function addPersonToRole(personHandle: number, role: RoleItem) {
    const person = persons.value.find(p => p.handle === personHandle);
    if (!person || person.handle == null) return;
    const newRoles = [...(person.roles || []).map(r => String(typeof r === 'object' ? r.handle : r)), String(role.handle)];
    await ApiGenericService.update<PersonItem>('person', { handle: person.handle }, { roles: newRoles }, { relations: ['roles'] });
    // Nachladen
    roles.value = (await ApiGenericService.find<RoleItem>('role', {relations: ['m:1', 'permissions'] })).data;
    persons.value = (await ApiGenericService.find<PersonItem>('person', {relations: ['roles'] })).data;

    // Dropdown zurücksetzen
    addPersonSelectModels[String(role.handle)] = null;
}

// Dialog-Status für das Entfernen einer Person aus einer Rolle
const deleteDialog = reactive<{ visible: boolean, person: PersonItem | null, role: RoleItem | null }>({ visible: false, person: null, role: null });

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
    // Nachladen
    roles.value = (await ApiGenericService.find<RoleItem>('role', {relations: ['m:1', 'permissions'] })).data;
    persons.value = (await ApiGenericService.find<PersonItem>('person', {relations: ['roles'] })).data;
    cancelRemovePersonFromRole();
}
// #endregion

// #region Konstanten
const persons = ref<PersonItem[]>([]);
const roles = ref<RoleItem[]>([]);
const entities = ref<EntityItem[]>([]);
const entity = ref<EntityItem | null>(null);
const openPanels = ref<number[]>([]);
const translationService = ref(new TranslationService());
const isLoading = ref(true);
// Für jedes Role-Handle ein eigenes Dropdown-Model
const addPersonSelectModels = reactive<Record<string, number|null>>({});
// #endregion

// #region Lifecycle
onMounted(async () => {
    loadEntity();
    await loadTranslations();
    persons.value = (await ApiGenericService.find<PersonItem>('person', {relations: ['roles'] })).data;
    roles.value = (await ApiGenericService.find<RoleItem>('role', {relations: ['m:1', 'permissions'] })).data;
    entities.value = (await ApiGenericService.find<EntityItem>('entity')).data;  
});

watch(() => i18n.global.locale.value, async () => {
  await loadTranslations();
});
// #endregion

// #region Methoden
/**
 * Prepare translations for navigation and group labels.
 */
async function loadTranslations() {
    isLoading.value = true;
    await translationService.value.prepare('global', 'entity', 'role', 'person', 'permission');
    isLoading.value = false;
}

/**
 * Hilfsfunktion für Stage-Titel
 */
const getStageTitle = (stage: RoleStageItem | string): string => {
    if (!stage) return 'global';
    if (typeof stage === 'string') return stage;
    if (typeof stage === 'object' && 'title' in stage) return stage.title;
    return 'global';
};

function getPersonsForRole(role: RoleItem): PersonItem[] {
    // Annahme: PersonItem hat roles: RoleItem[]
    const roleHandleStr = String(role.handle);
    return persons.value.filter(p => (p.roles || []).some(r => String(typeof r === 'object' ? r.handle : r) === roleHandleStr));
}

function getPermission(role: RoleItem, item: EntityItem, type: 'allowInsert'|'allowRead'|'allowUpdate'|'allowDelete'): boolean {
    if (!role.permissions) return false;
    const perm = role.permissions.find(p => p.entity && p.entity === item.handle);
    return perm ? perm[type] === true : false;
}

/**
 * Loads the entity definition.
 */
async function loadEntity() {
    entity.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { handle: 'right' }, limit: 1, page: 1 })).data[0] || null;
};

function setPermission(role: RoleItem, item: EntityItem, type: 'allowInsert'|'allowRead'|'allowUpdate'|'allowDelete', value: boolean) {
    console.log(`Set permission: role=${role.title}, entity=${item.handle}, type=${type}, value=${value}`);

    const entityHandleStr = String(item.handle);
    const roleHandleStr = String(role.handle);
    const permission = role.permissions?.find(p => String(typeof p.entity === 'object' ? p.entity.handle : p.entity) === entityHandleStr);
    if (!permission) {
        // Neue Berechtigung erstellen
        const newPermission: PermissionItem = {
            entity: entityHandleStr,
            roles: [roleHandleStr],
            allowInsert: false,
            allowRead: false,
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
// #endregion
</script>


