<template>
    <v-container class="fill-height pa-0" fluid>
        <v-row class="fill-height" no-gutters>
            <v-skeleton-loader
            v-if="isLoading"
            elevation="12"
            style="width: 100%;"
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
                                        <div class="role-header-row">
                                            <div class="role-header-label">{{ $t(`navigation.role`) }}</div>
                                            <div class="role-header-value"><v-chip color="primary" class="ma-1" small>{{ role.title }}</v-chip></div>
                                            <div class="role-header-label">{{ $t(`role.stage`) }}</div>
                                            <div class="role-header-value"><v-chip class="ma-1" small>{{ getStageTitle(role.stage) }}</v-chip></div>
                                            <div class="role-header-label">{{ $t(`role.persons`) }}</div>
                                            <div class="role-header-value">
                                                <div class="role-person-chips">
                                                    <v-chip
                                                        v-for="person in getPersonsForRole(role)"
                                                        :key="'person-'+person.handle"
                                                        color="secondary"
                                                        small
                                                    >
                                                        {{ person.firstName }} {{ person.lastName }}
                                                        <v-btn icon size="x-small" @click.stop="removePersonFromRole(person, role)"><v-icon small>mdi-close</v-icon></v-btn>
                                                    </v-chip>
                                                </div>
                                                <v-select
                                                    :items="getAvailablePersonsForRole(role)"
                                                    item-title="fullName"
                                                    item-value="handle"
                                                    :label="$t('role.addPerson')"
                                                    dense
                                                    hide-details
                                                    @update:model-value="val => addPersonToRole(val, role)"
                                                    :menu-props="{ maxHeight: '200px' }"
                                                    style="max-width: 200px;"
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
                                                <tr v-for="entity in entities" :key="entity.handle">
                                                    <td>
                                                        <v-icon v-if="entity.icon" left small>{{ entity.icon }}</v-icon>
                                                        {{ $t(`navigation.${entity.handle}`) }}
                                                    </td>
                                                    <td class="text-center">
                                                        <v-checkbox
                                                            v-if="entity.canInsert"
                                                            :model-value="getPermission(role, entity, 'allowInsert')"
                                                            @update:model-value="val => setPermission(role, entity, 'allowInsert', !!val)"
                                                            hide-details density="compact" :ripple="false"
                                                        />
                                                    </td>
                                                    <td class="text-center">
                                                        <v-checkbox
                                                            :model-value="getPermission(role, entity, 'allowRead')"
                                                            @update:model-value="val => setPermission(role, entity, 'allowRead', !!val)"
                                                            hide-details density="compact" :ripple="false"
                                                        />
                                                    </td>
                                                    <td class="text-center">
                                                        <v-checkbox
                                                            v-if="entity.canUpdate"
                                                            :model-value="getPermission(role, entity, 'allowUpdate')"
                                                            @update:model-value="val => setPermission(role, entity, 'allowUpdate', !!val)"
                                                            hide-details density="compact" :ripple="false"
                                                        />
                                                    </td>
                                                    <td class="text-center">
                                                        <v-checkbox
                                                            v-if="entity.canDelete"
                                                            :model-value="getPermission(role, entity, 'allowDelete')"
                                                            @update:model-value="val => setPermission(role, entity, 'allowDelete', !!val)"
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
import { ref, onMounted, watch } from 'vue';
import type { PersonItem, RoleItem, PermissionItem, EntityItem, RoleStageItem } from '../entity/entity';
import ApiGenericService from '../services/api.generic.service';
import TranslationService from '@/services/translation.service';
import { i18n } from '@/i18n';
// Hilfsfunktion: Gibt Personen zurück, die noch nicht in der Rolle sind
function getAvailablePersonsForRole(role: RoleItem): PersonItem[] {
    return persons.value
        .filter(p => !(p.roles || []).some(r => r.handle === role.handle))
        .map(p => ({ ...p, fullName: `${p.firstName} ${p.lastName}` }));
}

// Fügt eine Person zu einer Rolle hinzu (API Update)
async function addPersonToRole(personHandle: number, role: RoleItem) {
    const person = persons.value.find(p => p.handle === personHandle);
    if (!person || person.handle == null) return;
    const newRoles = [...(person.roles || []).map(r => r.handle), role.handle];
    isLoading.value = true;
    try {
        await ApiGenericService.update<PersonItem>('person', { handle: person.handle }, { roles: newRoles }, { relations: ['roles'] });
        // Nachladen
        persons.value = (await ApiGenericService.find<PersonItem>('person', {relations: ['roles'] })).data;
        roles.value = (await ApiGenericService.find<RoleItem>('role', {relations: ['m:1', 'permissions'] })).data;
    } finally {
        isLoading.value = false;
    }
}

// Entfernt eine Person aus einer Rolle (API Update)
async function removePersonFromRole(person: PersonItem, role: RoleItem) {
    if (person.handle == null) return;
    const newRoles = (person.roles || []).filter(r => r.handle !== role.handle);
    try {
        await ApiGenericService.update<PersonItem>('person', { handle: person.handle }, { roles: newRoles }, { relations: ['roles'] });
        // Nachladen
        persons.value = (await ApiGenericService.find<PersonItem>('person', {relations: ['roles'] })).data;
        roles.value = (await ApiGenericService.find<RoleItem>('role', {relations: ['m:1', 'permissions'] })).data;
    } finally {
        isLoading.value = false;
    }
}
// #endregion

// #region Konstanten
const persons = ref<PersonItem[]>([]);
const roles = ref<RoleItem[]>([]);
const entities = ref<EntityItem[]>([]);
const entity = ref<EntityItem | null>(null);
const allPermissions = ref<PermissionItem[]>([]); // Dummy bleibt leer, Logik ggf. anpassen
const openPanels = ref<number[]>([]);
const translationService = ref(new TranslationService());
const isLoading = ref(true);
// #endregion

// #region Lifecycle
onMounted(async () => {
    loadEntity();
    await prepareTranslations();
    persons.value = (await ApiGenericService.find<PersonItem>('person', {relations: ['roles'] })).data;
    roles.value = (await ApiGenericService.find<RoleItem>('role', {relations: ['m:1', 'permissions'] })).data;
    entities.value = (await ApiGenericService.find<EntityItem>('entity')).data;  
});

watch(() => i18n.global.locale.value, async () => {
  await prepareTranslations();
});
// #endregion

// #region Methoden
/**
 * Prepare translations for navigation and group labels.
 */
async function prepareTranslations() {
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
    return persons.value.filter(p => (p.roles || []).some(r => r.handle === role.handle));
}

function getPermission(role: RoleItem, entity: EntityItem, type: 'allowInsert'|'allowRead'|'allowUpdate'|'allowDelete'): boolean {
    if (!role.permissions) return false;
    const perm = role.permissions.find(p => p.entity && p.entity === entity.handle);
    return perm ? perm[type] === true : false;
}

/**
 * Loads the entity definition.
 */
async function loadEntity() {
    entity.value = (await ApiGenericService.find<EntityItem>(`entity`, { filter: { handle: 'right' }, limit: 1, page: 1 })).data[0] || null;
};

function setPermission(role: RoleItem, entity: EntityItem, type: 'allowInsert'|'allowRead'|'allowUpdate'|'allowDelete', value: boolean) {
    let perm = allPermissions.value.find(p =>
        p.entity === entity.handle && (p.roles || []).some(r => r.handle === role.handle)
    );
    isLoading.value = true;
    if (!perm) {
        // Permission existiert noch nicht, anlegen
        perm = {
            allowRead: false,
            allowInsert: false,
            allowUpdate: false,
            allowDelete: false,
            allowShow: false,
            entity: entity.handle,
            roles: [role],
            createdAt: null,
        };
        perm[type] = value;
        ApiGenericService.create<PermissionItem>('permission', perm)
            .then(() => reloadPermissions())
            .finally(() => { isLoading.value = false; });
        allPermissions.value.push(perm);
    } else {
        perm[type] = value;
        if (role.handle != null) {
            ApiGenericService.update<PermissionItem>('permission', { entity: entity.handle, role: role.handle }, { [type]: value })
                .then(() => reloadPermissions())
                .finally(() => { isLoading.value = false; });
        } else {
            isLoading.value = false;
        }
    }
}

async function reloadPermissions() {
    // Permissions neu laden
    allPermissions.value = (await ApiGenericService.find<PermissionItem>('permission')).data;
}
// #endregion
</script>


